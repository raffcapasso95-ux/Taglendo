import { describe, expect, it } from "vitest";
import { createTestSalon, inTx, SALON, type Tx } from "./db";

type Slot = { member_id: string; local: string; starts_at: Date; ends_at: Date };

async function slots(
  tx: Tx,
  s: { salonId: string; serviceId: string },
  args: { member?: string | null; from: string; days?: number; pub?: boolean; exclude?: string | null; step?: number | null },
) {
  return tx.q<Slot>(
    `select member_id, to_char(starts_at at time zone 'Europe/Rome', 'YYYY-MM-DD HH24:MI') as local, starts_at, ends_at
     from free_slots($1, $2, $3, $4::date, $5, $6, $7, $8)`,
    [s.salonId, s.serviceId, args.member ?? null, args.from, args.days ?? 1, args.pub ?? false, args.exclude ?? null, args.step ?? null],
  );
}

const times = (rows: Slot[]) => rows.map((r) => r.local.slice(11));

// 2027-04-05 lunedì · 2027-04-06 martedì: lontano da oggi, lontano dai cambi d'ora
const MONDAY = "2027-04-05";
const TUESDAY = "2027-04-06";

describe("free_slots · orari, pause e durata", () => {
  it("martedì 9–19 con pausa 13:00–14:30: ogni 15 minuti, la pausa non si prenota", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      const t = times(await slots(tx, s, { from: TUESDAY }));
      expect(t[0]).toBe("09:00");
      expect(t.at(-1)).toBe("18:30"); // 18:30 + 30 min = 19:00, chiusura
      expect(t).toContain("12:30"); // finisce alle 13:00, esattamente all'inizio della pausa
      expect(t).not.toContain("12:45"); // finirebbe alle 13:15, dentro la pausa
      expect(t).not.toContain("13:00");
      expect(t).not.toContain("14:15");
      expect(t).toContain("14:30"); // riparte alla fine della pausa
      expect(t).toHaveLength(15 + 17);
    });
  });

  it("un servizio da 50 minuti non sfora né la pausa né la chiusura", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { duration: 50 });
      await tx.as(s.userId);
      const t = times(await slots(tx, s, { from: TUESDAY }));
      expect(t).toContain("12:00"); // finisce alle 12:50
      expect(t).not.toContain("12:15"); // finirebbe alle 13:05
      expect(t).toContain("18:00"); // finisce alle 18:50
      expect(t).not.toContain("18:15"); // finirebbe alle 19:05
      expect(t).not.toContain("18:30");
    });
  });

  it("il servizio che finisce esattamente alla chiusura si propone, un minuto in più no", async () => {
    // aperto dalle 9:00 alle 9:40
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { duration: 30, hours: () => ({ closed: false, open: 540, close: 580 }) });
      await tx.as(s.userId);
      expect(times(await slots(tx, s, { from: TUESDAY, step: 5 }))).toEqual(["09:00", "09:05", "09:10"]); // 09:10 + 30 = 09:40
    });
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { duration: 31, hours: () => ({ closed: false, open: 540, close: 580 }) });
      await tx.as(s.userId);
      expect(times(await slots(tx, s, { from: TUESDAY, step: 5 }))).toEqual(["09:00", "09:05"]); // 09:10 + 31 = 09:41
    });
  });

  it("giorno chiuso: nessun orario. Su una settimana, solo martedì–sabato", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      expect(await slots(tx, s, { from: MONDAY })).toHaveLength(0);
      const days = new Set((await slots(tx, s, { from: MONDAY, days: 7 })).map((r) => r.local.slice(0, 10)));
      expect([...days]).toEqual(["2027-04-06", "2027-04-07", "2027-04-08", "2027-04-09", "2027-04-10"]);
    });
  });

  it("servizio sconosciuto, disattivo o di un altro salone: nessun orario", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      await tx.q(`update services set active = false where id = $1`, [s.serviceId]);
      await tx.as(s.userId);
      expect(await slots(tx, s, { from: TUESDAY })).toHaveLength(0);
      expect(await slots(tx, { salonId: s.salonId, serviceId: "5e500000-0000-4000-8000-000000000001" }, { from: TUESDAY })).toHaveLength(0);
    });
  });
});

describe("free_slots · appuntamenti", () => {
  const insert = `
    insert into appointments (salon_id, member_id, service_name, price_cents, starts_at, ends_at, status, cancelled_by)
    values ($1, $2, 'Taglio', 2000, $3::timestamptz, $4::timestamptz, $5, $6)
    returning id`;
  const at = (hhmm: string) => `${TUESDAY} ${hhmm}:00 Europe/Rome`;

  it("un appuntamento confermato blocca gli orari che si sovrappongono, non quelli attaccati", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      await tx.q(insert, [s.salonId, s.memberIds[0], at("10:00"), at("10:30"), "confermato", null]);
      const t = times(await slots(tx, s, { from: TUESDAY }));
      expect(t).toContain("09:30"); // finisce alle 10:00
      expect(t).not.toContain("09:45");
      expect(t).not.toContain("10:00");
      expect(t).not.toContain("10:15");
      expect(t).toContain("10:30"); // comincia quando l'altro finisce
    });
  });

  it("un appuntamento completato occupa ancora il suo orario; annullato e non presentato lo liberano", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      await tx.q(insert, [s.salonId, s.memberIds[0], at("10:00"), at("10:30"), "completato", null]);
      await tx.q(insert, [s.salonId, s.memberIds[0], at("11:00"), at("11:30"), "annullato", "salone"]);
      await tx.q(insert, [s.salonId, s.memberIds[0], at("12:00"), at("12:30"), "non_presentato", null]);
      const t = times(await slots(tx, s, { from: TUESDAY }));
      expect(t).not.toContain("10:00");
      expect(t).toContain("11:00");
      expect(t).toContain("12:00");
    });
  });

  it("gli appuntamenti di un barbiere non bloccano gli altri", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.as(s.userId);
      await tx.q(insert, [s.salonId, s.memberIds[0], at("10:00"), at("10:30"), "confermato", null]);
      const rows = await slots(tx, s, { from: TUESDAY });
      const at10 = rows.filter((r) => r.local.endsWith("10:00"));
      expect(at10.map((r) => r.member_id)).toEqual([s.memberIds[1]]);
      // chiedendo il primo barbiere in particolare, le 10:00 non ci sono
      expect(times(await slots(tx, s, { from: TUESDAY, member: s.memberIds[0] }))).not.toContain("10:00");
    });
  });

  it("p_exclude permette di spostare un appuntamento sul proprio orario", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      const [appt] = await tx.q<{ id: string }>(insert, [s.salonId, s.memberIds[0], at("10:00"), at("10:30"), "confermato", null]);
      expect(times(await slots(tx, s, { from: TUESDAY }))).not.toContain("10:00");
      expect(times(await slots(tx, s, { from: TUESDAY, exclude: appt!.id }))).toContain("10:00");
    });
  });

  it("senza preferenza: per ogni orario i barbieri sono in ordine di poltrona", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 3 });
      await tx.as(s.userId);
      const rows = await slots(tx, s, { from: TUESDAY });
      expect(rows.filter((r) => r.local.endsWith("09:00")).map((r) => r.member_id)).toEqual(s.memberIds);
      // ordinati per orario, poi per poltrona
      expect(rows.slice(0, 3).map((r) => r.member_id)).toEqual(s.memberIds);
    });
  });
});

describe("free_slots · chiusure e barbieri", () => {
  it("una chiusura di tutto il salone toglie i giorni scelti, estremi compresi", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.asAdmin();
      await tx.q(`insert into closures (salon_id, starts_on, ends_on) values ($1, '2027-04-07', '2027-04-08')`, [s.salonId]);
      await tx.as(s.userId);
      const days = new Set((await slots(tx, s, { from: TUESDAY, days: 5 })).map((r) => r.local.slice(0, 10)));
      expect([...days]).toEqual(["2027-04-06", "2027-04-09", "2027-04-10"]);
    });
  });

  it("la chiusura di un solo barbiere lascia liberi gli altri", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.asAdmin();
      await tx.q(`insert into closures (salon_id, member_id, starts_on, ends_on) values ($1, $2, $3, $3)`, [
        s.salonId,
        s.memberIds[0],
        TUESDAY,
      ]);
      await tx.as(s.userId);
      const rows = await slots(tx, s, { from: TUESDAY });
      expect(new Set(rows.map((r) => r.member_id))).toEqual(new Set([s.memberIds[1]]));
      // il giorno dopo c'è di nuovo
      const next = await slots(tx, s, { from: "2027-04-07" });
      expect(new Set(next.map((r) => r.member_id))).toEqual(new Set(s.memberIds));
    });
  });

  it("un barbiere disattivato non compare; chiederlo in particolare non dà nulla", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.asAdmin();
      await tx.q(`update members set active = false where id = $1`, [s.memberIds[1]]);
      await tx.as(s.userId);
      const rows = await slots(tx, s, { from: TUESDAY });
      expect(new Set(rows.map((r) => r.member_id))).toEqual(new Set([s.memberIds[0]]));
      expect(await slots(tx, s, { from: TUESDAY, member: s.memberIds[1] })).toHaveLength(0);
    });
  });
});

describe("free_slots · gestionale e pagina pubblica", () => {
  const todayLocal = async (tx: Tx) =>
    (await tx.q<{ d: string }>(`select to_char((now() at time zone 'Europe/Rome')::date, 'YYYY-MM-DD') as d`))[0]!.d;
  const addDays = async (tx: Tx, from: string, n: number) =>
    (await tx.q<{ d: string }>(`select to_char($1::date + $2::int, 'YYYY-MM-DD') as d`, [from, n]))[0]!.d;
  const allWeek = (): { closed: false; open: number; close: number } => ({ closed: false, open: 540, close: 1140 });

  it("nel gestionale non si propone mai un orario già passato", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { hours: allWeek });
      await tx.as(s.userId);
      const rows = await slots(tx, s, { from: await todayLocal(tx), days: 2 });
      const [{ now }] = await tx.q<{ now: Date }>(`select now()`);
      expect(rows.every((r) => r.starts_at.getTime() >= now.getTime())).toBe(true);
    });
  });

  it("nel gestionale il preavviso minimo non conta; sulla pagina pubblica sì", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { hours: allWeek });
      await tx.asAdmin();
      await tx.q(`update salons set min_notice_min = 1440 where id = $1`, [s.salonId]);
      await tx.as(s.userId);
      const from = await todayLocal(tx);
      const staff = await slots(tx, s, { from, days: 3 });
      const pub = await slots(tx, s, { from, days: 3, pub: true });
      const [{ limit }] = await tx.q<{ limit: Date }>(`select now() + interval '24 hours' as "limit"`);
      expect(staff[0]!.starts_at.getTime()).toBeLessThan(limit.getTime());
      expect(pub[0]!.starts_at.getTime()).toBeGreaterThanOrEqual(limit.getTime());
    });
  });

  it("l'anticipo massimo vale solo per la pagina pubblica", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { hours: allWeek });
      await tx.as(s.userId); // max_advance_days = 14 di serie
      const today = await todayLocal(tx);
      const beyond = await addDays(tx, today, 20);
      expect((await slots(tx, s, { from: beyond, days: 3, pub: true })).length).toBe(0);
      expect((await slots(tx, s, { from: beyond, days: 3 })).length).toBeGreaterThan(0);
      // l'ultimo giorno ammesso (oggi + 14) c'è; il successivo no
      const last = await addDays(tx, today, 14);
      expect((await slots(tx, s, { from: last, days: 2, pub: true })).every((r) => r.local.startsWith(last))).toBe(true);
    });
  });

  it("la pagina pubblica usa il passo del salone (30), il gestionale ogni 15 minuti", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { hours: allWeek });
      await tx.asAdmin();
      await tx.q(`update salons set slot_step_min = 30 where id = $1`, [s.salonId]);
      await tx.as(s.userId);
      const day = await addDays(tx, await todayLocal(tx), 3);
      const staff = times(await slots(tx, s, { from: day }));
      const pub = times(await slots(tx, s, { from: day, pub: true }));
      expect(staff).toContain("09:15");
      expect(pub).not.toContain("09:15");
      expect(pub).toContain("09:30");
    });
  });
});

describe("free_slots · cambio d'ora (Europe/Rome)", () => {
  const fullWeek = () => ({ closed: false, open: 540, close: 1140 });
  const night = () => ({ closed: false, open: 0, close: 300 });

  it("ora legale (domenica 28 marzo 2027): le 9:00 sono le 07:00 UTC, il giorno prima le 08:00", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { hours: fullWeek });
      await tx.as(s.userId);
      const before = await slots(tx, s, { from: "2027-03-27" });
      const day = await slots(tx, s, { from: "2027-03-28" });
      expect(before[0]!.starts_at.toISOString()).toBe("2027-03-27T08:00:00.000Z");
      expect(day[0]!.starts_at.toISOString()).toBe("2027-03-28T07:00:00.000Z");
      expect(day).toHaveLength(before.length); // stesse ore del muro
    });
  });

  it("ora solare (domenica 31 ottobre 2027): le 9:00 sono le 08:00 UTC, il giorno prima le 07:00", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { hours: fullWeek });
      await tx.as(s.userId);
      const before = await slots(tx, s, { from: "2027-10-30" });
      const day = await slots(tx, s, { from: "2027-10-31" });
      expect(before[0]!.starts_at.toISOString()).toBe("2027-10-30T07:00:00.000Z");
      expect(day[0]!.starts_at.toISOString()).toBe("2027-10-31T08:00:00.000Z");
      expect(day).toHaveLength(before.length);
    });
  });

  it("di notte, il giorno dell'ora legale le 02:00–02:59 non esistono e non si propongono", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { hours: night });
      await tx.as(s.userId);
      const rows = await slots(tx, s, { from: "2027-03-28", step: 30 });
      expect(times(rows)).toEqual(["00:00", "00:30", "01:00", "01:30", "03:00", "03:30", "04:00", "04:30"]);
      // nessun orario ripetuto, e in ordine
      const utc = rows.map((r) => r.starts_at.getTime());
      expect(new Set(utc).size).toBe(utc.length);
      expect([...utc].sort((a, b) => a - b)).toEqual(utc);
      // da 01:30 CET a 03:00 CEST passa mezz'ora, non un'ora e mezza
      expect(utc[4]! - utc[3]!).toBe(30 * 60 * 1000);
    });
  });

  it("di notte, il giorno dell'ora solare (02:00–02:59 due volte) ogni orario compare una volta sola", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { hours: night });
      await tx.as(s.userId);
      const rows = await slots(tx, s, { from: "2027-10-31", step: 30 });
      expect(times(rows)).toEqual(["00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30", "04:00", "04:30"]);
      const utc = rows.map((r) => r.starts_at.getTime());
      expect(new Set(utc).size).toBe(utc.length);
    });
  });
});

describe("free_slots · sicurezza", () => {
  it("nel gestionale serve essere membri del salone", async () => {
    await inTx(async (tx) => {
      await tx.as("a0000000-0000-4000-8000-000000000001");
      const err = await tx.error(`select * from free_slots($1, $2, null, '2027-04-06', 1)`, [
        "5a999999-0000-4000-8000-000000000001",
        "5e500000-0000-4000-8000-000000000001",
      ]);
      expect(err).toBe("42501");
    });
  });

  it("un altro salone non vede gli orari del mio", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as("a0000000-0000-4000-8000-000000000001"); // Andrea, titolare di Barberia Saragozza
      const err = await tx.error(`select * from free_slots($1, $2, null, '2027-04-06', 1)`, [s.salonId, s.serviceId]);
      expect(err).toBe("42501");
    });
  });

  it("anon non può chiamarla", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      const err = await tx.error(`select * from free_slots($1, $2, null, '2027-04-06', 1, true)`, [
        SALON,
        "5e500000-0000-4000-8000-000000000001",
      ]);
      expect(err).toBe("42501");
    });
  });

  it("intervallo e passo fuori misura sono rifiutati", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      expect(await tx.error(`select * from free_slots($1, $2, null, '2027-04-06', 0)`, [s.salonId, s.serviceId])).toBe("22023");
      expect(await tx.error(`select * from free_slots($1, $2, null, '2027-04-06', 63)`, [s.salonId, s.serviceId])).toBe("22023");
      expect(await tx.error(`select * from free_slots($1, $2, null, '2027-04-06', 1, false, null, 1)`, [s.salonId, s.serviceId])).toBe("22023");
    });
  });
});

describe("codice pubblico degli appuntamenti", () => {
  it("lo genera il database: TG- più 4 cifre, tutti diversi", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      for (let i = 0; i < 30; i++) {
        await tx.q(
          `insert into appointments (salon_id, member_id, service_name, price_cents, starts_at, ends_at)
           values ($1, $2, 'Taglio', 2000, '2027-05-01 08:00+00'::timestamptz + make_interval(mins => $3), '2027-05-01 08:30+00'::timestamptz + make_interval(mins => $3))`,
          [s.salonId, s.memberIds[0], i * 30],
        );
      }
      const rows = await tx.q<{ public_code: string; manage_token: string }>(`select public_code, manage_token from appointments`);
      expect(rows).toHaveLength(30);
      expect(rows.every((r) => /^TG-\d{4}$/.test(r.public_code))).toBe(true);
      expect(new Set(rows.map((r) => r.public_code)).size).toBe(30);
      expect(new Set(rows.map((r) => r.manage_token)).size).toBe(30);
    });
  });
});
