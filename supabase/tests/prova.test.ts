import { describe, expect, it } from "vitest";
import { createTestSalon, inTx, type Tx } from "./db";

const ADMIN = "c1000000-0000-4000-8000-000000000002";

async function setup(tx: Tx) {
  const s = await createTestSalon(tx, { chairs: 1 });
  await tx.asAdmin();
  await tx.q(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
     values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', 'creatore2@example.com', '', now(), now())`,
    [ADMIN],
  );
  await tx.q(`insert into platform_admins (user_id, email) values ($1, 'creatore2@example.com')`, [ADMIN]);
  await tx.q(`update salons set onboarding_step = 5, lat = 44.49, lng = 11.34, city = 'Bologna' where id = $1`, [s.salonId]);
  const [client] = await tx.q<{ id: string }>(`insert into clients (salon_id, name, phone) values ($1, 'Mario', '+39 333 1234567') returning id`, [s.salonId]);
  await tx.q(
    `insert into appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, public_code, manage_token, source)
     values ($1, $2, $3, $4, 'Taglio', 2000, now() + interval '2 days', now() + interval '2 days 30 minutes', 'TG-0002', 'tok-0002', 'online')`,
    [s.salonId, s.memberIds[0], client!.id, s.serviceId],
  );
  return s;
}

describe("la prova: 30 giorni, poi il salone è bloccato", () => {
  it("la prova di un salone nuovo dura 30 giorni", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      const [r] = await tx.q<{ d: number }>(`select round(extract(epoch from (trial_ends_at - now())) / 86400)::int as d from salons where id = $1`, [s.salonId]);
      expect(r!.d).toBe(30);
    });
  });

  it("a prova finita: si vede l'agenda, non si aggiunge niente, la pagina e le prenotazioni online spariscono", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      const slots = async () => {
        await tx.asAdmin();
        return (await tx.q(`select * from free_slots($1, $2, null, (current_date + 3)::date, 7, true)`, [s.salonId, s.serviceId])).length;
      };
      // prova in corso: tutto aperto
      await tx.as(s.userId);
      await tx.q(`insert into clients (salon_id, name) values ($1, 'Primo')`, [s.salonId]);
      await tx.as(null);
      expect((await tx.q<{ p: unknown }>(`select public_salon('salone-di-prova') as p`))[0]!.p).not.toBeNull();
      expect(await slots()).toBeGreaterThan(0);

      // la prova finisce
      await tx.asAdmin();
      await tx.q(`update salons set trial_ends_at = now() - interval '1 minute' where id = $1`, [s.salonId]);
      expect((await tx.q<{ l: string }>(`select private.salon_lock($1) as l`, [s.salonId]))[0]!.l).toBe("trial_ended");

      await tx.as(null);
      expect((await tx.q<{ p: unknown }>(`select public_salon('salone-di-prova') as p`))[0]!.p).toBeNull();
      expect(await slots()).toBe(0);
      expect((await tx.q<{ s: string }>(`select public_salon_slugs() as s`)).map((r) => r.s)).not.toContain("salone-di-prova");
      expect((await tx.q<{ slug: string }>(`select slug from find_salons(44.49, 11.34, 30, 40, null, null)`)).some((r) => r.slug === "salone-di-prova")).toBe(false);

      await tx.as(s.userId);
      expect(await tx.q(`select * from appointments where salon_id = $1`, [s.salonId])).toHaveLength(1);
      expect((await tx.q(`select * from clients_visible where salon_id = $1`, [s.salonId])).length).toBeGreaterThan(0);
      expect(await tx.error(`insert into clients (salon_id, name) values ($1, 'Nuovo')`, [s.salonId])).toBe("42501");
      expect(await tx.error(`update appointments set status = 'completato' where salon_id = $1`, [s.salonId])).toBe("42501");
      expect(await tx.error(`insert into services (salon_id, name, duration_min, price_cents) values ($1, 'Altro', 30, 1000)`, [s.salonId])).toBe("42501");
      expect(await tx.error(`update salons set name = 'Cambio' where id = $1`, [s.salonId])).toBe("42501");
      expect(await tx.error(`select set_week_hours($1, '[]'::jsonb)`, [s.salonId])).toBe("42501");
      // segnare le notifiche come lette non è una modifica del salone
      expect(await tx.error(`update members set activity_seen_at = now() where id = $1`, [s.memberIds[0]])).toBeNull();
    });
  });

  it("con l'abbonamento attivo la prova scaduta non conta; prolungare la prova riapre tutto", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      await tx.asAdmin();
      await tx.q(`update salons set trial_ends_at = now() - interval '3 days' where id = $1`, [s.salonId]);
      await tx.q(`update salons set sub_status = 'active' where id = $1`, [s.salonId]);
      expect((await tx.q<{ l: string | null }>(`select private.salon_lock($1) as l`, [s.salonId]))[0]!.l).toBeNull();
      await tx.q(`update salons set sub_status = 'trialing' where id = $1`, [s.salonId]);
      expect((await tx.q<{ l: string | null }>(`select private.salon_lock($1) as l`, [s.salonId]))[0]!.l).toBe("trial_ended");

      await tx.as(ADMIN);
      await tx.q(`select admin_extend_trial($1, 30)`, [s.salonId]);
      await tx.as(s.userId);
      await tx.q(`insert into clients (salon_id, name) values ($1, 'Di nuovo')`, [s.salonId]);
      await tx.as(null);
      expect((await tx.q<{ p: unknown }>(`select public_salon('salone-di-prova') as p`))[0]!.p).not.toBeNull();
    });
  });

  it("un salone sospeso resta 'suspended' anche a prova in corso", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      await tx.asAdmin();
      await tx.q(`update salons set suspended_at = now() where id = $1`, [s.salonId]);
      expect((await tx.q<{ l: string }>(`select private.salon_lock($1) as l`, [s.salonId]))[0]!.l).toBe("suspended");
    });
  });
});
