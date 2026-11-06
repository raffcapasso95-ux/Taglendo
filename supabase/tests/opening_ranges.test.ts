import { describe, expect, it } from "vitest";
import { createOtherSalon, createTestSalon, inTx, type Tx } from "./db";

type Slot = { local: string };
const TUESDAY = "2027-04-06"; // lontano da oggi e dai cambi d'ora

async function times(tx: Tx, s: { salonId: string; serviceId: string }, step: number | null = null) {
  const rows = await tx.q<Slot>(
    `select to_char(starts_at at time zone 'Europe/Rome', 'HH24:MI') as local from free_slots($1, $2, null, $3::date, 1, false, null, $4)`,
    [s.salonId, s.serviceId, TUESDAY, step],
  );
  return rows.map((r) => r.local);
}

const week = (ranges: Array<[number, number]>, weekday = 2) =>
  JSON.stringify([{ weekday, closed: false, ranges }]);

describe("fasce orarie: orari diversi per ogni giorno", () => {
  it("con tre fasce si prenota solo dentro le fasce, e la griglia parte dalla prima", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { duration: 30 });
      await tx.as(s.userId);
      // 9–12, 14:10–16, 18–19: il tratto 14:10 comincia fuori dai quarti d'ora, ma la griglia resta quella delle 9:00
      await tx.q(`select set_week_hours($1, $2::jsonb)`, [s.salonId, week([[540, 720], [850, 960], [1080, 1140]])]);
      const t = await times(tx, s, 15);
      expect(t.slice(0, 6)).toEqual(["09:00", "09:15", "09:30", "09:45", "10:00", "10:15"]);
      expect(t).toContain("11:30"); // finisce alle 12:00
      expect(t).not.toContain("11:45");
      expect(t).not.toContain("12:30"); // pausa
      expect(t).not.toContain("14:00"); // la seconda fascia comincia alle 14:10
      expect(t).toContain("14:15"); // primo quarto d'ora dentro la fascia, sulla griglia delle 9:00
      expect(t).toContain("15:30");
      expect(t).not.toContain("15:45"); // finirebbe alle 16:15
      expect(t).not.toContain("16:30"); // pausa lunga
      expect(t).toContain("18:00");
      expect(t).toContain("18:30");
      expect(t).not.toContain("18:45");
    });
  });

  it("due fasce che si toccano sono senza pausa; che si sovrappongono sono rifiutate dal database", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      expect(await tx.error(`insert into opening_ranges (salon_id, weekday, start_min, end_min) values ($1, 1, 540, 780), ($1, 1, 700, 900)`, [s.salonId])).toBe("23P01");
      expect(await tx.error(`insert into opening_ranges (salon_id, weekday, start_min, end_min) values ($1, 1, 700, 600)`, [s.salonId])).toBe("23514");
    });
  });

  it("solo il titolare cambia gli orari, e solo del proprio salone", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const other = await createOtherSalon(tx);
      await tx.as(other.userId);
      expect(await tx.error(`select set_week_hours($1, $2::jsonb)`, [s.salonId, week([[540, 600]])])).toBe("42501");
      // un barbiere (non titolare) del proprio salone non può nemmeno scrivere direttamente
      await tx.as(s.userId);
      await tx.q(`select set_week_hours($1, $2::jsonb)`, [s.salonId, week([[540, 600]], 4)]);
      const [r] = await tx.q<{ n: string }>(`select count(*) as n from opening_ranges where salon_id = $1 and weekday = 4`, [s.salonId]);
      expect(r!.n).toBe("1");
    });
  });

  it("le fasce di un salone non si leggono dall'altro", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const other = await createOtherSalon(tx);
      await tx.as(other.userId);
      const rows = await tx.q(`select * from opening_ranges where salon_id = $1`, [s.salonId]);
      expect(rows).toHaveLength(0);
    });
  });

  it("salvando la settimana le fasce vecchie spariscono tutte insieme; chiudere un giorno ne tiene le fasce", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      const payload = JSON.stringify([
        { weekday: 2, closed: false, ranges: [[480, 720]] },
        { weekday: 3, closed: true, ranges: [[540, 780], [870, 1140]] },
      ]);
      await tx.q(`select set_week_hours($1, $2::jsonb)`, [s.salonId, payload]);
      const tue = await tx.q<{ start_min: number }>(`select start_min from opening_ranges where salon_id = $1 and weekday = 2`, [s.salonId]);
      expect(tue.map((r) => r.start_min)).toEqual([480]); // il vecchio 9–13 / 14:30–19 non c'è più
      const wed = await tx.q(`select * from opening_ranges where salon_id = $1 and weekday = 3`, [s.salonId]);
      expect(wed).toHaveLength(2); // chiuso, ma le fasce restano
      const none = await times(tx, s);
      expect(none[0]).toBe("08:00");
      const [closed] = await tx.q<{ closed: boolean }>(`select closed from opening_hours where salon_id = $1 and weekday = 3`, [s.salonId]);
      expect(closed!.closed).toBe(true);
    });
  });
});
