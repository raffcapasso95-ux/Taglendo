import { describe, expect, it } from "vitest";
import { ANDREA, MARCO, SALON, createOtherSalon, createTestSalon, inTx, type Tx } from "./db";

type Stats = { visits: string; spent_cents: string; last_visit_at: Date | null; next_at: Date | null; usual_service_id: string | null; usual_member_id: string | null };

async function statsFor(tx: Tx, clientId: string) {
  const [row] = await tx.q<Stats>(`select visits, spent_cents, last_visit_at, next_at, usual_service_id, usual_member_id from client_stats where client_id = $1`, [clientId]);
  return row;
}

describe("client_stats", () => {
  it("conta solo le visite completate e somma i loro prezzi", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      const [c] = await tx.q<{ id: string }>(`insert into clients (salon_id, name) values ($1, 'Mario Verdi') returning id`, [s.salonId]);
      const add = (day: number, status: string, price: number, cancelled: string | null = null) =>
        tx.q(
          `insert into appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, status, cancelled_by)
           values ($1, $2, $3, $4, 'Taglio', $5, now() - make_interval(days => $6), now() - make_interval(days => $6) + interval '30 minutes', $7::appt_status_t, $8)`,
          [s.salonId, s.memberIds[0], c!.id, s.serviceId, price, day, status, cancelled],
        );
      await add(10, "completato", 2000);
      await add(20, "completato", 2500);
      await add(30, "annullato", 2000, "cliente");
      await add(40, "non_presentato", 2000);
      await tx.as(s.userId);
      const st = await statsFor(tx, c!.id);
      expect(st).toMatchObject({ visits: "2", spent_cents: "4500", next_at: null });
      const [expected] = await tx.q<{ last: Date }>(`select max(starts_at) as last from appointments where status = 'completato'`);
      expect(st!.last_visit_at!.getTime()).toBe(expected!.last.getTime());
    });
  });

  it("il prossimo appuntamento è il primo confermato che non è ancora finito", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      const [c] = await tx.q<{ id: string }>(`insert into clients (salon_id, name) values ($1, 'Mario Verdi') returning id`, [s.salonId]);
      const add = (startOffset: string, endOffset: string, status: string) =>
        tx.q(
          `insert into appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, status, cancelled_by)
           values ($1, $2, $3, $4, 'Taglio', 2000, now() + $5::interval, now() + $6::interval, $7::appt_status_t, case when $7 = 'annullato' then 'salone' end)`,
          [s.salonId, s.memberIds[0], c!.id, s.serviceId, startOffset, endOffset, status],
        );
      await add("-2 hours", "-90 minutes", "confermato"); // finito: non conta
      await add("-10 minutes", "20 minutes", "confermato"); // in corso: conta
      await add("1 day", "1 day 30 minutes", "confermato");
      await add("2 hours", "150 minutes", "annullato"); // annullato: non conta
      await tx.as(s.userId);
      const st = await statsFor(tx, c!.id);
      const [{ now }] = await tx.q<{ now: Date }>(`select now()`);
      expect(Math.round((now.getTime() - st!.next_at!.getTime()) / 60000)).toBe(10); // quello in corso
    });
  });

  it("il solito: servizio e barbiere più frequenti, a parità il più recente", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.asAdmin();
      const [other] = await tx.q<{ id: string }>(`insert into services (salon_id, name, duration_min, price_cents) values ($1, 'Barba', 20, 1200) returning id`, [s.salonId]);
      const [c] = await tx.q<{ id: string }>(`insert into clients (salon_id, name) values ($1, 'Mario Verdi') returning id`, [s.salonId]);
      const add = (days: number, service: string, member: string, name: string) =>
        tx.q(
          `insert into appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, status)
           values ($1, $2, $3, $4, $5, 1000, now() - make_interval(days => $6), now() - make_interval(days => $6) + interval '30 minutes', 'completato')`,
          [s.salonId, member, c!.id, service, name, days],
        );
      await add(30, s.serviceId, s.memberIds[0]!, "Taglio");
      await add(20, other!.id, s.memberIds[1]!, "Barba");
      await add(10, s.serviceId, s.memberIds[0]!, "Taglio");
      await tx.as(s.userId);
      expect(await statsFor(tx, c!.id)).toMatchObject({ usual_service_id: s.serviceId, usual_member_id: s.memberIds[0] });

      // parità 1–1: vince il più recente
      await tx.asAdmin();
      await tx.q(`delete from appointments where client_id = $1 and starts_at < now() - interval '25 days'`, [c!.id]);
      await tx.as(s.userId);
      expect((await statsFor(tx, c!.id))!.usual_service_id).toBe(s.serviceId);
    });
  });

  it("un cliente senza visite ha tutto a zero", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      const [c] = await tx.q<{ id: string }>(`insert into clients (salon_id, name) values ($1, 'Nuovo Cliente') returning id`, [s.salonId]);
      await tx.as(s.userId);
      expect(await statsFor(tx, c!.id)).toEqual({ visits: "0", spent_cents: "0", last_visit_at: null, next_at: null, usual_service_id: null, usual_member_id: null });
    });
  });

  it("i dati del seed: Luca Rossi 14 visite, Antonio Esposito 40", async () => {
    await inTx(async (tx) => {
      await tx.as(ANDREA);
      const rows = await tx.q<{ name: string; visits: string }>(
        `select c.name, s.visits from client_stats s join clients_visible c on c.id = s.client_id where c.name in ('Luca Rossi', 'Antonio Esposito') order by c.name`,
      );
      expect(rows).toEqual([
        { name: "Antonio Esposito", visits: "40" },
        { name: "Luca Rossi", visits: "14" },
      ]);
    });
  });

  it("un altro salone non vede le statistiche del mio", async () => {
    await inTx(async (tx) => {
      const other = await createOtherSalon(tx);
      await tx.as(other.userId);
      expect(await tx.q(`select 1 from client_stats where salon_id = $1`, [SALON])).toHaveLength(0);
      expect(await tx.q(`select 1 from client_stats`)).toHaveLength(1); // solo il proprio cliente
    });
  });

  it("senza «vedere l'agenda di tutti» un barbiere conta solo le proprie visite", async () => {
    await inTx(async (tx) => {
      await tx.as(ANDREA);
      const [all] = await tx.q<{ visits: string }>(`select s.visits from client_stats s join clients_visible c on c.id = s.client_id where c.name = 'Antonio Esposito'`);
      await tx.asAdmin();
      await tx.q(`update salons set barbers_see_all = false where id = $1`, [SALON]);
      await tx.as(MARCO);
      const [mine] = await tx.q<{ visits: string }>(`select s.visits from client_stats s join clients_visible c on c.id = s.client_id where c.name = 'Antonio Esposito'`);
      expect(Number(mine!.visits)).toBeLessThan(Number(all!.visits)); // Antonio è cliente di Andrea
    });
  });

  it("anon non legge le statistiche", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      expect(await tx.error(`select 1 from client_stats`)).toBe("42501");
    });
  });
});
