import { describe, expect, it } from "vitest";
import { createOtherSalon, createTestSalon, inTx, type Tx } from "./db";

const ADMIN = "c1000000-0000-4000-8000-000000000001";

/** Un amministratore di Taglendo (come postgres), e il salone di prova con un cliente e un appuntamento. */
async function setup(tx: Tx) {
  const s = await createTestSalon(tx, { chairs: 2 });
  await tx.asAdmin();
  await tx.q(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
     values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', 'creatore@example.com', '', now(), now())`,
    [ADMIN],
  );
  await tx.q(`insert into platform_admins (user_id, email) values ($1, 'creatore@example.com')`, [ADMIN]);
  await tx.q(`update salons set onboarding_step = 5, lat = 44.49, lng = 11.34, city = 'Bologna' where id = $1`, [s.salonId]);
  const [client] = await tx.q<{ id: string }>(`insert into clients (salon_id, name, phone, email) values ($1, 'Mario Segretissimo', '+39 333 1234567', 'mario@example.com') returning id`, [s.salonId]);
  await tx.q(
    `insert into appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, public_code, manage_token, source)
     values ($1, $2, $3, $4, 'Taglio', 2000, now() + interval '2 days', now() + interval '2 days 30 minutes', 'TG-0001', 'tok-0001', 'online')`,
    [s.salonId, s.memberIds[0], client!.id, s.serviceId],
  );
  return s;
}

describe("gestionale di Taglendo: accesso", () => {
  it("un salone (anche titolare) non può usare le funzioni admin, né leggere l'elenco degli amministratori", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      await tx.as(s.userId);
      expect(await tx.error(`select admin_overview()`)).toBe("42501");
      expect(await tx.error(`select admin_salons()`)).toBe("42501");
      expect(await tx.error(`select admin_salon($1)`, [s.salonId])).toBe("42501");
      expect(await tx.error(`select admin_set_hidden($1, true)`, [s.salonId])).toBe("42501");
      expect(await tx.error(`select admin_set_suspended($1, true, 'x')`, [s.salonId])).toBe("42501");
      expect(await tx.error(`select admin_extend_trial($1, 10)`, [s.salonId])).toBe("42501");
      expect(await tx.error(`select admin_add_note($1, 'x')`, [s.salonId])).toBe("42501");
      expect(await tx.error(`select * from platform_admins`)).toBe("42501");
      expect((await tx.q<{ b: boolean }>(`select is_platform_admin() as b`))[0]!.b).toBe(false);
      await tx.as(null);
      expect(await tx.error(`select admin_overview()`)).not.toBeNull();
    });
  });

  it("l'amministratore entra e vede panoramica, elenco e scheda", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      await createOtherSalon(tx);
      await tx.as(ADMIN);
      expect((await tx.q<{ b: boolean }>(`select is_platform_admin() as b`))[0]!.b).toBe(true);
      const [o] = await tx.q<{ admin_overview: { salons: number; clients: number; appointments: { total: number; online30: number } } }>(`select admin_overview()`);
      expect(o!.admin_overview.salons).toBeGreaterThanOrEqual(2);
      expect(o!.admin_overview.clients).toBeGreaterThanOrEqual(2);
      expect(o!.admin_overview.appointments.total).toBeGreaterThanOrEqual(1);
      const [l] = await tx.q<{ admin_salons: { total: number; rows: Array<{ name: string; owner_email: string; appts: number; state: string }> } }>(`select admin_salons('prova') as admin_salons`);
      expect(l!.admin_salons.rows.map((r) => r.name)).toContain("Salone di prova");
      const row = l!.admin_salons.rows.find((r) => r.name === "Salone di prova")!;
      expect(row.owner_email).toBe("prova@example.com");
      expect(row.appts).toBe(1);
      const [d] = await tx.q<{ admin_salon: { salon: { name: string; public: boolean }; members: unknown[]; services: unknown[]; counts: { clients: number; appointments: number; online: number } } }>(`select admin_salon($1) as admin_salon`, [s.salonId]);
      expect(d!.admin_salon.salon.name).toBe("Salone di prova");
      expect(d!.admin_salon.members).toHaveLength(2);
      expect(d!.admin_salon.counts).toMatchObject({ clients: 1, appointments: 1, online: 1 });
    });
  });

  it("dei clienti finali escono solo conteggi: niente nome, telefono o email", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      await tx.as(ADMIN);
      const [d] = await tx.q<{ j: string }>(`select admin_salon($1)::text as j`, [s.salonId]);
      for (const secret of ["Segretissimo", "+39 333 1234567", "mario@example.com"]) expect(d!.j).not.toContain(secret);
      const [l] = await tx.q<{ j: string }>(`select admin_salons(null)::text as j`);
      for (const secret of ["Segretissimo", "+39 333 1234567", "mario@example.com"]) expect(l!.j).not.toContain(secret);
      // e le tabelle restano chiuse anche a lui: passa solo dalle funzioni
      expect(await tx.error(`select * from clients where salon_id = $1`, [s.salonId])).toBe("42501");
      expect(await tx.q(`select * from clients_visible where salon_id = $1`, [s.salonId])).toHaveLength(0); // nemmeno dalla vista dei saloni
    });
  });
});

describe("gestionale di Taglendo: azioni", () => {
  it("nascondere dalla ricerca: il salone sparisce dai risultati, la pagina resta; mostrare lo riporta", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      const found = async () => (await tx.q<{ slug: string }>(`select slug from find_salons(44.49, 11.34, 30, 40, null, null)`)).some((r) => r.slug === "salone-di-prova");
      await tx.as(null);
      expect(await found()).toBe(true);
      await tx.as(ADMIN);
      await tx.q(`select admin_set_hidden($1, true, 'prova')`, [s.salonId]);
      await tx.as(null);
      expect(await found()).toBe(false);
      expect((await tx.q<{ p: unknown }>(`select public_salon('salone-di-prova') as p`))[0]!.p).not.toBeNull(); // la pagina c'è ancora
      await tx.as(ADMIN);
      await tx.q(`select admin_set_hidden($1, false)`, [s.salonId]);
      await tx.as(null);
      expect(await found()).toBe(true);
    });
  });

  it("sospendere: pagina e orari online spenti, i suoi utenti leggono ma non scrivono; riattivare ripristina", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      // gli orari che vede la pagina pubblica (la funzione la chiamano le prenotazioni, non il browser)
      const slots = async () => {
        await tx.asAdmin();
        return (await tx.q(`select * from free_slots($1, $2, null, (current_date + 3)::date, 7, true)`, [s.salonId, s.serviceId])).length;
      };
      expect(await slots()).toBeGreaterThan(0);
      await tx.as(ADMIN);
      expect(await tx.error(`select admin_set_suspended($1, true, '')`, [s.salonId])).toBe("22023"); // serve il motivo
      await tx.q(`select admin_set_suspended($1, true, 'Pagamento non riuscito')`, [s.salonId]);

      // pubblico: niente pagina, niente orari, fuori dalla ricerca e dalla sitemap
      await tx.as(null);
      expect((await tx.q<{ p: unknown }>(`select public_salon('salone-di-prova') as p`))[0]!.p).toBeNull();
      expect(await slots()).toBe(0);
      expect((await tx.q<{ s: string }>(`select public_salon_slugs() as s`)).map((r) => r.s)).not.toContain("salone-di-prova");
      expect((await tx.q<{ slug: string }>(`select slug from find_salons(44.49, 11.34, 30, 40, null, null)`)).some((r) => r.slug === "salone-di-prova")).toBe(false);

      // il titolare: legge (agenda con gli appuntamenti già fissati), non scrive
      await tx.as(s.userId);
      expect(await tx.q(`select * from appointments where salon_id = $1`, [s.salonId])).toHaveLength(1);
      expect(await tx.q(`select * from clients_visible where salon_id = $1`, [s.salonId])).toHaveLength(1);
      expect(await tx.error(`insert into clients (salon_id, name) values ($1, 'Nuovo')`, [s.salonId])).toBe("42501");
      expect(await tx.error(`update appointments set status = 'completato' where salon_id = $1`, [s.salonId])).toBe("42501");
      expect(await tx.error(`insert into services (salon_id, name, duration_min, price_cents) values ($1, 'Altro', 30, 1000)`, [s.salonId])).toBe("42501");
      expect(await tx.error(`update salons set name = 'Cambio' where id = $1`, [s.salonId])).toBe("42501");
      expect(await tx.error(`select set_week_hours($1, '[]'::jsonb)`, [s.salonId])).toBe("42501");

      // l'amministratore può ancora intervenire; riattivando tutto torna
      await tx.as(ADMIN);
      await tx.q(`select admin_set_suspended($1, false)`, [s.salonId]);
      await tx.as(s.userId);
      await tx.q(`insert into clients (salon_id, name) values ($1, 'Nuovo')`, [s.salonId]);
      expect(await slots()).toBeGreaterThan(0);
    });
  });

  it("un salone sospeso non tocca gli altri, e gli altri non vengono bloccati", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      const other = await createOtherSalon(tx);
      await tx.as(ADMIN);
      await tx.q(`select admin_set_suspended($1, true, 'x')`, [s.salonId]);
      await tx.as(other.userId);
      await tx.q(`insert into clients (salon_id, name) values ($1, 'Cliente di Gino')`, [other.salonId]);
    });
  });

  it("prolungare la prova, note e registro", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      await tx.asAdmin();
      await tx.q(`update salons set sub_status = 'expired', trial_ends_at = now() - interval '5 days' where id = $1`, [s.salonId]);
      await tx.as(ADMIN);
      expect(await tx.error(`select admin_extend_trial($1, 0)`, [s.salonId])).toBe("22023");
      expect(await tx.error(`select admin_extend_trial($1, 400)`, [s.salonId])).toBe("22023");
      const [r] = await tx.q<{ until: string }>(`select admin_extend_trial($1, 15, 'Chiede più tempo') as until`, [s.salonId]);
      expect(new Date(r!.until).getTime()).toBeGreaterThan(Date.now() + 14 * 86400000);
      await tx.q(`select admin_add_note($1, 'Ha chiamato: vuole il listino')`, [s.salonId]);
      expect(await tx.error(`select admin_add_note($1, '   ')`, [s.salonId])).toBe("22023");
      const [d] = await tx.q<{ d: { salon: { sub_status: string }; notes: Array<{ body: string; author: string }>; audit: Array<{ action: string; admin: string }> } }>(`select admin_salon($1) as d`, [s.salonId]);
      expect(d!.d.salon.sub_status).toBe("trialing");
      expect(d!.d.notes[0]).toMatchObject({ body: "Ha chiamato: vuole il listino", author: "creatore@example.com" });
      expect(d!.d.audit.map((a) => a.action)).toEqual(expect.arrayContaining(["prova_prolungata", "nota"]));
      expect(d!.d.audit[0]!.admin).toBe("creatore@example.com");
    });
  });

  it("l'elenco filtra per stato, cerca e ordina", async () => {
    await inTx(async (tx) => {
      const s = await setup(tx);
      await createOtherSalon(tx);
      await tx.as(ADMIN);
      await tx.q(`select admin_set_suspended($1, true, 'x')`, [s.salonId]);
      const names = async (status: string, q: string | null = null) =>
        (await tx.q<{ j: { rows: Array<{ name: string }> } }>(`select admin_salons($1, $2) as j`, [q, status]))[0]!.j.rows.map((r) => r.name);
      expect(await names("suspended")).toEqual(["Salone di prova"]);
      expect(await names("all", "altra")).toEqual(["Altra Barberia"]);
      expect(await names("all", "gino")).toEqual(["Altra Barberia"]); // si cerca anche per nome del titolare
      expect(await names("all", "prova@example")).toEqual(["Salone di prova"]); // e per la sua email
      expect(await names("hidden")).toEqual([]);
      const [asc] = await tx.q<{ j: { rows: Array<{ name: string }> } }>(`select admin_salons(null, 'all', 'name', 'asc') as j`);
      const sorted = asc!.j.rows.map((r) => r.name.toLowerCase());
      expect(sorted).toEqual([...sorted].sort());
    });
  });
});
