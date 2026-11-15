import { describe, expect, it } from "vitest";
import { createOtherSalon, createTestSalon, inTx, type Tx } from "./db";

const TUESDAY = "2027-04-06"; // lontano da oggi e dai cambi d'ora; il salone di prova è aperto da martedì (9–13 e 14:30–19)

async function times(tx: Tx, s: { salonId: string; serviceId: string }, member: string | null) {
  const rows = await tx.q<{ local: string }>(
    `select to_char(starts_at at time zone 'Europe/Rome', 'HH24:MI') as local from free_slots($1, $2, $3, $4::date, 1, false, null, 30)`,
    [s.salonId, s.serviceId, member, TUESDAY],
  );
  return rows.map((r) => r.local);
}

const week = (days: Record<number, Array<[number, number]> | "chiuso">) =>
  JSON.stringify(
    Array.from({ length: 7 }, (_, weekday) => {
      const d = days[weekday];
      return { weekday, closed: d === "chiuso" || d === undefined, ranges: Array.isArray(d) ? d : [] };
    }),
  );

describe("orari dei singoli operatori", () => {
  it("senza orari propri un operatore segue il salone; con orari propri propone solo i suoi", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.as(s.userId);
      const [a, b] = s.memberIds as [string, string];
      const salon = await times(tx, s, b);
      expect(salon).toContain("09:00");
      expect(salon).toContain("18:30");
      // il secondo barbiere lavora solo di pomeriggio, il martedì
      await tx.q(`select set_member_week($1, $2, $3::jsonb)`, [s.salonId, b, week({ 2: [[840, 1080]] })]);
      const own = await times(tx, s, b);
      expect(own[0]).toBe("14:00");
      expect(own).toContain("17:30");
      expect(own).not.toContain("09:00");
      expect(own).not.toContain("18:00");
      // il primo non cambia
      expect(await times(tx, s, a)).toEqual(salon);
    });
  });

  it("«Nessuna preferenza» propone gli orari di chi lavora in quel momento", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.as(s.userId);
      const [a, b] = s.memberIds as [string, string];
      await tx.q(`select set_member_week($1, $2, $3::jsonb)`, [s.salonId, a, week({ 2: [[540, 720]] })]);
      await tx.q(`select set_member_week($1, $2, $3::jsonb)`, [s.salonId, b, week({ 2: [[900, 1020]] })]);
      const any = await times(tx, s, null);
      expect(any).toContain("09:00");
      expect(any).toContain("15:00");
      expect(any).not.toContain("13:00");
      expect(any).not.toContain("18:00");
    });
  });

  it("un giorno segnato «non lavora» non dà orari a quell'operatore, gli altri sì", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.as(s.userId);
      const [a, b] = s.memberIds as [string, string];
      await tx.q(`select set_member_week($1, $2, $3::jsonb)`, [s.salonId, b, week({ 3: [[540, 1140]] })]); // martedì chiuso, mercoledì aperto
      expect(await times(tx, s, b)).toEqual([]);
      expect((await times(tx, s, a)).length).toBeGreaterThan(0);
    });
  });

  it("l'assenza di un giorno (chiusura di un solo barbiere) toglie solo i suoi orari", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      const [a, b] = s.memberIds as [string, string];
      await tx.as(s.userId);
      await tx.q(`insert into closures (salon_id, member_id, starts_on, ends_on, note) values ($1, $2, $3, $3, 'Visita')`, [s.salonId, b, TUESDAY]);
      expect(await times(tx, s, b)).toEqual([]);
      expect((await times(tx, s, a)).length).toBeGreaterThan(0);
      expect((await times(tx, s, null)).length).toBeGreaterThan(0);
    });
  });

  it("p_week null riporta l'operatore agli orari del salone", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.as(s.userId);
      const b = s.memberIds[1]!;
      const before = await times(tx, s, b);
      await tx.q(`select set_member_week($1, $2, $3::jsonb)`, [s.salonId, b, week({ 2: [[840, 1080]] })]);
      expect(await times(tx, s, b)).not.toEqual(before);
      await tx.q(`select set_member_week($1, $2, null)`, [s.salonId, b]);
      expect(await times(tx, s, b)).toEqual(before);
    });
  });

  it("solo il titolare, solo del proprio salone; fasce sovrapposte rifiutate", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      const other = await createOtherSalon(tx);
      const b = s.memberIds[1]!;
      await tx.as(other.userId);
      expect(await tx.error(`select set_member_week($1, $2, $3::jsonb)`, [s.salonId, b, week({ 2: [[540, 600]] })])).toBe("42501");
      // un titolare non può usare l'operatore di un altro salone
      expect(await tx.error(`select set_member_week($1, $2, $3::jsonb)`, [other.salonId, b, week({ 2: [[540, 600]] })])).toBe("42501");
      await tx.as(s.userId);
      expect(await tx.error(`select set_member_week($1, $2, $3::jsonb)`, [s.salonId, b, week({ 2: [[540, 700], [650, 900]] })])).toBe("23P01");
    });
  });

  it("gli orari dei barbieri di un salone non si leggono dall'altro", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      const other = await createOtherSalon(tx);
      await tx.as(s.userId);
      await tx.q(`select set_member_week($1, $2, $3::jsonb)`, [s.salonId, s.memberIds[1], week({ 2: [[540, 600]] })]);
      await tx.as(other.userId);
      expect(await tx.q(`select * from member_hours where salon_id = $1`, [s.salonId])).toHaveLength(0);
      expect(await tx.q(`select * from member_ranges where salon_id = $1`, [s.salonId])).toHaveLength(0);
    });
  });
});
