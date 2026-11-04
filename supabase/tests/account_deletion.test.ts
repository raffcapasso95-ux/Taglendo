import { describe, expect, it } from "vitest";
import { createOtherSalon, createTestSalon, inTx } from "./db";

describe("request_account_deletion", () => {
  it("il titolare mette il salone offline: non lo vede più nessuno e i futuri sono annullati", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      const [a] = await tx.q<{ id: string }>(
        `insert into appointments (salon_id, member_id, service_id, service_name, price_cents, public_code, starts_at, ends_at)
         values ($1, $2, $3, 'Taglio', 2000, 'TG-111111', now() + interval '2 days', now() + interval '2 days 30 minutes') returning id`,
        [s.salonId, s.memberIds[0], s.serviceId],
      );
      await tx.as(s.userId);
      const [r] = await tx.q<{ n: number }>(`select public.request_account_deletion() as n`);
      expect(r!.n).toBe(1);
      await tx.asAdmin();
      const [salon] = await tx.q<{ deleted_at: string | null; booking_online: boolean }>(`select deleted_at, booking_online from salons where id = $1`, [s.salonId]);
      expect(salon!.deleted_at).not.toBeNull();
      expect(salon!.booking_online).toBe(false);
      // l'indirizzo si libera subito
      expect(await tx.q(`select 1 from salons where slug = 'salone-di-prova' and id = $1`, [s.salonId])).toHaveLength(0);
      const [ap] = await tx.q<{ status: string; cancelled_by: string }>(`select status, cancelled_by from appointments where id = $1`, [a!.id]);
      expect(ap).toMatchObject({ status: "annullato", cancelled_by: "salone" });
      // la pagina pubblica non esiste più
      await tx.as(null);
      const [page] = await tx.q<{ p: unknown }>(`select public.public_salon($1) as p`, ["salone-di-prova"]);
      expect(page!.p).toBeNull();
      // e chi era titolare non vede più nulla
      await tx.as(s.userId);
      expect(await tx.q(`select 1 from appointments where salon_id = $1`, [s.salonId])).toHaveLength(0);
    });
  });

  it("un barbiere perde solo il proprio accesso: il salone resta", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.asAdmin();
      const barber = "c0000000-0000-4000-8000-0000000000b1";
      await tx.q(
        `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
         values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', 'barbiere-x@example.com', '', now(), now())`,
        [barber],
      );
      const [m] = await tx.q<{ id: string }>(
        `insert into members (salon_id, user_id, name, role, chair_no, invite_email) values ($1, $2, 'Luca Neri', 'barber', 3, 'barbiere-x@example.com') returning id`,
        [s.salonId, barber],
      );
      await tx.as(barber);
      const [r] = await tx.q<{ n: number }>(`select public.request_account_deletion() as n`);
      expect(r!.n).toBe(0);
      await tx.asAdmin();
      const [salon] = await tx.q<{ deleted_at: string | null }>(`select deleted_at from salons where id = $1`, [s.salonId]);
      expect(salon!.deleted_at).toBeNull();
      const [row] = await tx.q<{ user_id: string | null; active: boolean; invite_email: string | null }>(`select user_id, active, invite_email from members where id = $1`, [m!.id]);
      expect(row).toEqual({ user_id: null, active: false, invite_email: null });
    });
  });

  it("senza accesso non si può chiamare", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      expect(await tx.error(`select public.request_account_deletion()`)).toBe("42501");
    });
  });

  it("un altro salone non viene toccato", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const other = await createOtherSalon(tx);
      await tx.as(s.userId);
      await tx.q(`select public.request_account_deletion()`);
      await tx.asAdmin();
      const [o] = await tx.q<{ deleted_at: string | null }>(`select deleted_at from salons where id = $1`, [other.salonId]);
      expect(o!.deleted_at).toBeNull();
    });
  });
});

describe("purge_deleted_salons", () => {
  it("cancella solo i saloni eliminati da più di 30 giorni, con tutti i loro dati", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      const other = await createOtherSalon(tx);
      await tx.asAdmin();
      await tx.q(`update salons set deleted_at = now() - interval '31 days' where id = $1`, [s.salonId]);
      await tx.q(`update salons set deleted_at = now() - interval '5 days' where id = $1`, [other.salonId]);
      const [r] = await tx.q<{ n: number }>(`select public.purge_deleted_salons() as n`);
      expect(r!.n).toBeGreaterThanOrEqual(1);
      expect(await tx.q(`select 1 from salons where id = $1`, [s.salonId])).toHaveLength(0);
      expect(await tx.q(`select 1 from members where salon_id = $1`, [s.salonId])).toHaveLength(0);
      expect(await tx.q(`select 1 from salons where id = $1`, [other.salonId])).toHaveLength(1);
    });
  });

  it("gli utenti non possono lanciarla", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      expect(await tx.error(`select public.purge_deleted_salons()`)).toBe("42501");
    });
  });
});
