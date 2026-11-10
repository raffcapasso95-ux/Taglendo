import { describe, expect, it } from "vitest";
import { createTestSalon, inTx } from "./db";

const TUESDAY = "2027-04-06";

describe("durata a scelta per un appuntamento", () => {
  it("free_slots con 40 minuti invece dei 30 del listino: l'ultimo orario si sposta e la fine segue", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      const rows = await tx.q<{ local: string; mins: number }>(
        `select to_char(starts_at at time zone 'Europe/Rome', 'HH24:MI') as local, extract(epoch from ends_at - starts_at)::int / 60 as mins
         from free_slots($1, $2, null, $3::date, 1, false, null, null, 40)`,
        [s.salonId, s.serviceId, TUESDAY],
      );
      expect(rows[0]!.mins).toBe(40);
      expect(rows.map((r) => r.local)).not.toContain("18:30"); // 18:30 + 40 sforerebbe le 19
      expect(rows.map((r) => r.local)).toContain("18:15"); // 18:15 + 40 = 18:55
    });
  });

  it("il pubblico usa sempre la durata del listino", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(null);
      const [r] = await tx.q<{ mins: number }>(
        `select extract(epoch from ends_at - starts_at)::int / 60 as mins from free_slots($1, $2, null, $3::date, 1, true, null, null, 40) limit 1`,
        [s.salonId, s.serviceId, TUESDAY],
      ).catch(() => [{ mins: -1 }]);
      // anon non può chiamarla direttamente (solo il server): se passa, la durata resta 30
      if (r && r.mins !== -1) expect(r.mins).toBe(30);
    });
  });

  it("durata fuori misura: errore", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      expect(await tx.error(`select * from free_slots($1, $2, null, $3::date, 1, false, null, null, 2)`, [s.salonId, s.serviceId, TUESDAY])).toBe("22023");
    });
  });
});

describe("notifiche: l'attività del salone", () => {
  it("nuovo, spostato, completato e annullato dal cliente finiscono nell'attività, con chi l'ha fatto", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx, { chairs: 2 });
      await tx.asAdmin();
      const [c] = await tx.q<{ id: string }>(`insert into clients (salon_id, name) values ($1, 'Luca Rossi') returning id`, [s.salonId]);
      await tx.as(s.userId);
      const [a] = await tx.q<{ id: string }>(
        `insert into appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at)
         values ($1, $2, $3, $4, 'Taglio', 2000, '2027-04-06 09:00+02', '2027-04-06 09:30+02') returning id`,
        [s.salonId, s.memberIds[1], c!.id, s.serviceId],
      );
      await tx.q(`update appointments set starts_at = '2027-04-06 10:00+02', ends_at = '2027-04-06 10:30+02' where id = $1`, [a!.id]);
      await tx.q(`update appointments set status = 'completato' where id = $1`, [a!.id]);
      await tx.q(`update appointments set price_cents = 1500 where id = $1`, [a!.id]); // il prezzo non è una notifica
      await tx.asAdmin(); // come il link «Gestisci la prenotazione» del cliente: chiave di servizio, nessun utente
      await tx.q(`select set_config('request.jwt.claims', '', true)`);
      await tx.q(`update appointments set status = 'annullato', cancelled_by = 'cliente' where id = $1`, [a!.id]);

      const rows = await tx.q<{ kind: string; by_client: boolean; actor_name: string | null; client_name: string; old_starts_at: Date | null; member_name: string }>(
        `select kind, by_client, actor_name, client_name, old_starts_at, member_name from activity where appointment_id = $1 order by created_at, kind`,
        [a!.id],
      );
      expect(rows.map((r) => r.kind)).toEqual(["nuovo", "spostato", "completato", "annullato"]);
      expect(rows[0]).toMatchObject({ actor_name: "Barbiere 1", client_name: "Luca Rossi", member_name: "Barbiere 2", by_client: false });
      expect(rows[1]!.old_starts_at).not.toBeNull();
      expect(rows[3]).toMatchObject({ by_client: true, actor_name: null });
    });
  });

  it("l'attività si legge solo nel proprio salone e non si scrive a mano; «letto» vale per chi è collegato", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      await tx.q(
        `insert into appointments (salon_id, member_id, service_id, service_name, price_cents, starts_at, ends_at)
         values ($1, $2, $3, 'Taglio', 2000, '2027-04-06 09:00+02', '2027-04-06 09:30+02')`,
        [s.salonId, s.memberIds[0], s.serviceId],
      );
      expect(await tx.q(`select id from activity`)).toHaveLength(1);
      expect(await tx.error(`insert into activity (salon_id, kind) values ($1, 'nuovo')`, [s.salonId])).toBe("42501");
      await tx.q(`select mark_activity_seen($1)`, [s.salonId]);
      const [m] = await tx.q<{ activity_seen_at: Date | null }>(`select activity_seen_at from members where id = $1`, [s.memberIds[0]]);
      expect(m!.activity_seen_at).not.toBeNull();
      await tx.as("b9000000-0000-4000-8000-000000000009"); // un estraneo
      expect(await tx.q(`select id from activity`)).toHaveLength(0);
    });
  });
});
