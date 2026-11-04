import { describe, expect, it } from "vitest";
import { MARCO, SALON, createOtherSalon, createTestSalon, inTx, type Tx } from "./db";

async function setup(tx: Tx) {
  const s = await createTestSalon(tx);
  await tx.asAdmin();
  const [c] = await tx.q<{ id: string }>(`insert into clients (salon_id, name, email, phone) values ($1, 'Mario Verdi', 'mario@example.com', '333 1') returning id`, [s.salonId]);
  const add = (offset: string, status: string, cancelled: string | null = null) =>
    tx.q<{ id: string }>(
      `insert into appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, status, cancelled_by)
       values ($1, $2, $3, $4, 'Taglio', 2000, now() + $5::interval, now() + $5::interval + interval '30 minutes', $6::appt_status_t, $7) returning id`,
      [s.salonId, s.memberIds[0], c!.id, s.serviceId, offset, status, cancelled],
    );
  return { s, clientId: c!.id, add };
}

describe("delete_client", () => {
  it("il titolare elimina il cliente: gli incassi restano senza nome, i futuri vengono annullati", async () => {
    await inTx(async (tx) => {
      const { s, clientId, add } = await setup(tx);
      const [past] = await add("-10 days", "completato");
      const [future] = await add("3 days", "confermato");
      await tx.q(`insert into booking_codes (salon_id, email, code_hash, payload) values ($1, 'MARIO@example.com', 'x', '{}')`, [s.salonId]);
      await tx.as(s.userId);
      const [r] = await tx.q<{ n: number }>(`select public.delete_client($1) as n`, [clientId]);
      expect(r!.n).toBe(1);
      await tx.asAdmin();
      expect(await tx.q(`select 1 from clients where id = $1`, [clientId])).toHaveLength(0);
      const [p] = await tx.q<{ status: string; client_id: string | null; price_cents: number }>(`select status, client_id, price_cents from appointments where id = $1`, [past!.id]);
      expect(p).toMatchObject({ status: "completato", client_id: null, price_cents: 2000 });
      const [f] = await tx.q<{ status: string; cancelled_by: string }>(`select status, cancelled_by from appointments where id = $1`, [future!.id]);
      expect(f).toMatchObject({ status: "annullato", cancelled_by: "salone" });
      expect(await tx.q(`select 1 from booking_codes where salon_id = $1`, [s.salonId])).toHaveLength(0);
    });
  });

  it("un barbiere non può eliminare un cliente", async () => {
    await inTx(async (tx) => {
      await tx.asAdmin();
      const [c] = await tx.q<{ id: string }>(`select id from clients where salon_id = $1 limit 1`, [SALON]);
      await tx.as(MARCO);
      expect(await tx.error(`select public.delete_client($1)`, [c!.id])).toBe("42501");
      await tx.asAdmin();
      expect(await tx.q(`select 1 from clients where id = $1`, [c!.id])).toHaveLength(1);
    });
  });

  it("il titolare di un altro salone non tocca i clienti altrui", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const other = await createOtherSalon(tx);
      await tx.as(s.userId);
      expect(await tx.error(`select public.delete_client($1)`, [other.clientId])).toBe("42501");
      await tx.asAdmin();
      expect(await tx.q(`select 1 from clients where id = $1`, [other.clientId])).toHaveLength(1);
    });
  });

  it("senza accesso non si può chiamare", async () => {
    await inTx(async (tx) => {
      const { clientId } = await setup(tx);
      await tx.as(null);
      expect(await tx.error(`select public.delete_client($1)`, [clientId])).toBe("42501");
    });
  });
});
