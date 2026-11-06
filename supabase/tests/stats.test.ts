import { describe, expect, it } from "vitest";
import { createOtherSalon, createTestSalon, inTx } from "./db";

type Summary = {
  revenue: number;
  count: number;
  clients: number;
  discounts: number;
  no_show: number;
  canceled: number;
  by_member: Array<{ member_id: string; revenue: number; count: number }>;
  top: Array<{ name: string; visits: number; revenue: number }>;
  series: Array<{ bucket: string; revenue: number }>;
};

const FROM = "2026-10-01T00:00:00+02:00";
const TO = "2026-11-01T00:00:00+01:00";

/** Ridisegno novembre 2026, passo 7: le statistiche contano i completati al prezzo fatto e le vede solo il titolare. */
describe("statistiche", () => {
  async function seed(tx: Parameters<Parameters<typeof inTx>[0]>[0]) {
    const s = await createTestSalon(tx, { chairs: 2 });
    await tx.asAdmin();
    const [a, b] = await tx.q<{ id: string }>(`insert into clients (salon_id, name) values ($1, 'Anna'), ($1, 'Bruno') returning id`, [s.salonId]);
    const add = (member: string, client: string, day: string, price: number, status: string, list: number | null = null) =>
      tx.q(
        `insert into appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, list_price_cents, starts_at, ends_at, status, cancelled_by)
         values ($1, $2, $3, $4, 'Taglio', $5, $6, $7::timestamptz, $7::timestamptz + interval '30 minutes', $8::appt_status_t, case when $8 = 'annullato' then 'salone' end)`,
        [s.salonId, member, client, s.serviceId, price, list, day, status],
      );
    await add(s.memberIds[0]!, a!.id, "2026-10-05T10:00:00+02:00", 2000, "completato");
    await add(s.memberIds[0]!, a!.id, "2026-10-05T11:00:00+02:00", 1500, "completato", 2000); // sconto 5 €
    await add(s.memberIds[1]!, b!.id, "2026-10-06T10:00:00+02:00", 3000, "completato");
    await add(s.memberIds[1]!, b!.id, "2026-10-06T11:00:00+02:00", 1000, "non_presentato");
    await add(s.memberIds[1]!, b!.id, "2026-10-06T12:00:00+02:00", 1000, "annullato");
    await add(s.memberIds[1]!, b!.id, "2026-10-06T13:00:00+02:00", 1000, "confermato");
    return s;
  }

  it("conta solo i completati, al prezzo fatto, con sconti, operatori, top e andamento", async () => {
    await inTx(async (tx) => {
      const s = await seed(tx);
      await tx.as(s.userId);
      const [row] = await tx.q<{ r: Summary }>(`select stats_summary($1, $2, $3, 'day') as r`, [s.salonId, FROM, TO]);
      const r = row!.r;
      expect(r.revenue).toBe(6500);
      expect(r.count).toBe(3);
      expect(r.clients).toBe(2);
      expect(r.discounts).toBe(500);
      expect(r.no_show).toBe(1);
      expect(r.canceled).toBe(1);
      expect(r.by_member.map((m) => [m.revenue, m.count])).toEqual([
        [3500, 2],
        [3000, 1],
      ]);
      expect(r.top.map((t) => t.name)).toEqual(["Anna", "Bruno"]);
      expect(r.top[0]).toMatchObject({ visits: 2, revenue: 3500 });
      expect(r.series).toEqual([
        { bucket: "2026-10-05", revenue: 3500 },
        { bucket: "2026-10-06", revenue: 3000 },
      ]);
      const [month] = await tx.q<{ r: Summary }>(`select stats_summary($1, $2, $3, 'month') as r`, [s.salonId, FROM, TO]);
      expect(month!.r.series).toEqual([{ bucket: "2026-10", revenue: 6500 }]);
    });
  });

  it("non le vede il barbiere né un altro salone", async () => {
    await inTx(async (tx) => {
      const s = await seed(tx);
      const other = await createOtherSalon(tx);
      await tx.asAdmin();
      await tx.q(`update members set user_id = $1 where id = $2`, [other.userId, s.memberIds[1]]);
      await tx.as(other.userId); // titolare di un altro salone
      expect(await tx.error(`select stats_summary($1, $2, $3, 'day')`, [s.salonId, FROM, TO])).toBe("42501");
      await tx.asAdmin();
      await tx.q(`update members set user_id = null where id = $1`, [s.memberIds[1]]);
      await tx.as(null);
      expect(await tx.error(`select stats_summary($1, $2, $3, 'day')`, [s.salonId, FROM, TO])).not.toBeNull();
    });
  });
});
