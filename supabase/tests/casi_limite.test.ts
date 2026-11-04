import { describe, expect, it } from "vitest";
import { createTestSalon, inTx, type Tx } from "./db";

/** Casi limite di docs/06-casi-limite.md non coperti dagli altri file di test del database. */
async function booked(tx: Tx, inMinutes: number, limit: number) {
  const s = await createTestSalon(tx);
  await tx.asAdmin();
  await tx.q(`update salons set cancel_online = true, cancel_limit_min = $2 where id = $1`, [s.salonId, limit]);
  const [a] = await tx.q<{ id: string; manage_token: string }>(
    `insert into appointments (salon_id, member_id, service_id, service_name, price_cents, starts_at, ends_at, status, source)
     values ($1, $2, $3, 'Taglio', 2000, now() + make_interval(mins => $4), now() + make_interval(mins => $4 + 30), 'confermato', 'online') returning id, manage_token`,
    [s.salonId, s.memberIds[0], s.serviceId, inMinutes],
  );
  return { s, id: a!.id, token: a!.manage_token };
}
const cancel = async (tx: Tx, token: string) => (await tx.q<{ r: { status: string } }>(`select public.cancel_booking_by_token($1) as r`, [token]))[0]!.r.status;

describe("annullamento al limite (1 minuto prima e 1 minuto dopo)", () => {
  for (const limit of [120, 1440]) {
    it(`limite di ${limit} minuti: a +1 e esattamente sul limite si annulla, a -1 è troppo tardi`, async () => {
      await inTx(async (tx) => expect(await cancel(tx, (await booked(tx, limit + 1, limit)).token)).toBe("ok"));
      await inTx(async (tx) => expect(await cancel(tx, (await booked(tx, limit, limit)).token)).toBe("ok"));
      await inTx(async (tx) => expect(await cancel(tx, (await booked(tx, limit - 1, limit)).token)).toBe("too_late"));
    });
  }
});

describe("chiusura inserita dopo la prenotazione", () => {
  it("l'appuntamento resta confermato e il giorno chiuso non propone più orari", async () => {
    await inTx(async (tx) => {
      const { s, id } = await booked(tx, 3 * 24 * 60, 120);
      const [d] = await tx.q<{ day: string }>(`select ((now() at time zone 'Europe/Rome') + interval '3 days')::date::text as day`);
      await tx.q(`insert into closures (salon_id, starts_on, ends_on, note) values ($1, $2, $2, 'Ferie')`, [s.salonId, d!.day]);
      const [a] = await tx.q<{ status: string }>(`select status from appointments where id = $1`, [id]);
      expect(a!.status).toBe("confermato");
      await tx.as(s.userId);
      const slots = await tx.q(`select * from public.free_slots($1, $2, null, $3::date, 1)`, [s.salonId, s.serviceId, d!.day]);
      expect(slots).toHaveLength(0);
    });
  });
});

describe("barbiere disattivato con appuntamenti futuri", () => {
  it("gli appuntamenti restano e il titolare li legge ancora", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.asAdmin();
      const [a] = await tx.q<{ id: string }>(
        `insert into appointments (salon_id, member_id, service_id, service_name, price_cents, starts_at, ends_at, status)
         values ($1, $2, $3, 'Taglio', 2000, now() + interval '2 days', now() + interval '2 days 30 minutes', 'confermato') returning id`,
        [s.salonId, s.memberIds[1], s.serviceId],
      );
      await tx.q(`update members set active = false where id = $1`, [s.memberIds[1]]);
      await tx.as(s.userId);
      const rows = await tx.q<{ status: string }>(`select status from appointments where id = $1`, [a!.id]);
      expect(rows).toEqual([{ status: "confermato" }]);
    });
  });
});

describe("cliente con 128 visite", () => {
  it("le conta tutte e somma gli incassi", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      const [c] = await tx.q<{ id: string }>(`insert into clients (salon_id, name) values ($1, 'Cliente Storico') returning id`, [s.salonId]);
      await tx.q(
        `insert into appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, status)
         select $1, $2, $3, $4, 'Taglio', 2000, now() - make_interval(days => g), now() - make_interval(days => g) + interval '30 minutes', 'completato'
         from generate_series(1, 128) g`,
        [s.salonId, s.memberIds[0], c!.id, s.serviceId],
      );
      await tx.as(s.userId);
      const [st] = await tx.q<{ visits: string; spent_cents: string }>(`select visits, spent_cents from client_stats where client_id = $1`, [c!.id]);
      expect(st).toEqual({ visits: "128", spent_cents: "256000" });
    });
  });
});
