import { describe, expect, it } from "vitest";
import { createTestSalon, inTx, type Tx } from "./db";

async function book(tx: Tx, opts: { inMinutes: number; cancelOnline?: boolean; limit?: number; status?: string }) {
  const s = await createTestSalon(tx);
  await tx.asAdmin();
  await tx.q(`update salons set cancel_online = $2, cancel_limit_min = $3 where id = $1`, [s.salonId, opts.cancelOnline ?? true, opts.limit ?? 120]);
  const [c] = await tx.q<{ id: string }>(`insert into clients (salon_id, name, email) values ($1, 'Mario Verdi', 'mario@example.com') returning id`, [s.salonId]);
  const [a] = await tx.q<{ id: string; manage_token: string }>(
    `insert into appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, status, source, cancelled_by)
     values ($1, $2, $3, $4, 'Taglio', 2000, now() + make_interval(mins => $5), now() + make_interval(mins => $5 + 30), $6::appt_status_t, 'online', $7) returning id, manage_token`,
    [s.salonId, s.memberIds[0], c!.id, s.serviceId, opts.inMinutes, opts.status ?? "confermato", opts.status === "annullato" ? "salone" : null],
  );
  return { s, token: a!.manage_token, id: a!.id };
}
const cancel = async (tx: Tx, token: string) => (await tx.q<{ r: { status: string; client_email?: string; send_email?: boolean } }>(`select public.cancel_booking_by_token($1) as r`, [token]))[0]!.r;
const view = async (tx: Tx, token: string) => (await tx.q<{ r: { status: string; salon: { slug: string; phone: string }; public_code: string } | null }>(`select public.booking_by_token($1) as r`, [token]))[0]!.r;

describe("gestione della prenotazione dal link", () => {
  it("il link mostra la prenotazione e i dati pubblici del salone", async () => {
    await inTx(async (tx) => {
      const { token } = await book(tx, { inMinutes: 600 });
      const r = await view(tx, token);
      expect(r).toMatchObject({ status: "confermato", salon: { slug: "salone-di-prova" } });
      expect(r!.public_code).toMatch(/^TG-/);
      expect(JSON.stringify(r)).not.toMatch(/mario@example\.com|stripe|vat_number/);
    });
  });

  it("un token inventato non mostra niente", async () => {
    await inTx(async (tx) => {
      expect(await view(tx, "x".repeat(64))).toBeNull();
      expect((await cancel(tx, "x".repeat(64))).status).toBe("gone");
    });
  });

  it("si annulla fino al limite: prima ok, dopo 'troppo tardi'", async () => {
    await inTx(async (tx) => {
      const early = await book(tx, { inMinutes: 125 });
      const r = await cancel(tx, early.token);
      expect(r).toMatchObject({ status: "ok", client_email: "mario@example.com", send_email: true });
      const [a] = await tx.q<{ status: string; cancelled_by: string }>(`select status, cancelled_by from appointments where id = $1`, [early.id]);
      expect(a).toEqual({ status: "annullato", cancelled_by: "cliente" });
    });
    await inTx(async (tx) => {
      const late = await book(tx, { inMinutes: 119 });
      expect((await cancel(tx, late.token)).status).toBe("too_late");
      const [a] = await tx.q<{ status: string }>(`select status from appointments where id = $1`, [late.id]);
      expect(a!.status).toBe("confermato");
    });
  });

  it("limite di 24 ore", async () => {
    await inTx(async (tx) => {
      const { token } = await book(tx, { inMinutes: 24 * 60 - 1, limit: 1440 });
      expect((await cancel(tx, token)).status).toBe("too_late");
    });
  });

  it("con l'annullamento online spento si chiama il salone", async () => {
    await inTx(async (tx) => {
      const { token, id } = await book(tx, { inMinutes: 2000, cancelOnline: false });
      expect((await cancel(tx, token)).status).toBe("not_allowed");
      const [a] = await tx.q<{ status: string }>(`select status from appointments where id = $1`, [id]);
      expect(a!.status).toBe("confermato");
    });
  });

  it("appuntamento già annullato, già iniziato o completato: il link non vale più", async () => {
    await inTx(async (tx) => {
      const once = await book(tx, { inMinutes: 2000 });
      expect((await cancel(tx, once.token)).status).toBe("ok");
      expect((await cancel(tx, once.token)).status).toBe("gone");
    });
    await inTx(async (tx) => {
      const past = await book(tx, { inMinutes: -60 });
      expect((await cancel(tx, past.token)).status).toBe("gone");
    });
    await inTx(async (tx) => {
      const done = await book(tx, { inMinutes: 2000, status: "completato" });
      expect((await cancel(tx, done.token)).status).toBe("gone");
    });
  });

  it("rispetta la scelta del salone sull'email di annullamento", async () => {
    await inTx(async (tx) => {
      const { s, token } = await book(tx, { inMinutes: 2000 });
      await tx.q(`insert into email_prefs (salon_id, cancellation) values ($1, false) on conflict (salon_id) do update set cancellation = false`, [s.salonId]);
      expect((await cancel(tx, token)).send_email).toBe(false);
    });
  });

  it("nessun utente può chiamare le funzioni", async () => {
    await inTx(async (tx) => {
      const { s, token } = await book(tx, { inMinutes: 2000 });
      for (const who of [null, s.userId]) {
        await tx.as(who);
        expect(await tx.error(`select public.booking_by_token($1)`, [token])).toBe("42501");
        expect(await tx.error(`select public.cancel_booking_by_token($1)`, [token])).toBe("42501");
      }
    });
  });
});
