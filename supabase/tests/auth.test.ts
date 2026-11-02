import { describe, expect, it } from "vitest";
import { ANDREA, MARCO, SALON, inTx, type Tx } from "./db";

const NEW_USER = "c0000000-0000-4000-8000-000000000001";

async function createUser(tx: Tx, id: string, confirmed = true, name: string | null = "Giulia Neri") {
  await tx.asAdmin();
  await tx.q(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                             raw_user_meta_data, created_at, updated_at)
     values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
             $2, '', ${confirmed ? "now()" : "null"}, $3::jsonb, now(), now())`,
    [id, `${id.slice(0, 8)}@example.com`, JSON.stringify(name ? { name } : {})],
  );
}

describe("register_salon", () => {
  it("crea salone in prova (+15 giorni), titolare, orari e preferenze", async () => {
    await inTx(async (tx) => {
      await createUser(tx, NEW_USER);
      await tx.as(NEW_USER);
      const [{ register_salon: salonId }] = await tx.q<{ register_salon: string }>(`select register_salon()`);

      const [salon] = await tx.q<Record<string, unknown>>(
        `select name, slug, plan, sub_status, onboarding_step, phone,
                round(extract(epoch from (trial_ends_at - now())) / 86400) as trial_days
         from salons where id = $1`,
        [salonId],
      );
      expect(salon).toMatchObject({
        name: "Salone di Giulia Neri",
        plan: "trial",
        sub_status: "trialing",
        onboarding_step: 1,
        phone: null,
        trial_days: "15",
      });
      expect(String(salon!.slug)).toMatch(/^salone-[0-9a-f]{8}$/);

      const members = await tx.q(`select name, role, chair_no from members where salon_id = $1`, [salonId]);
      expect(members).toEqual([{ name: "Giulia Neri", role: "owner", chair_no: 1 }]);

      const hours = await tx.q<{ weekday: number; closed: boolean }>(
        `select weekday, closed from opening_hours where salon_id = $1 order by weekday`,
        [salonId],
      );
      expect(hours.map((h) => h.closed)).toEqual([true, true, false, false, false, false, false]);
      expect(await tx.q(`select 1 from email_prefs where salon_id = $1`, [salonId])).toHaveLength(1);
    });
  });

  it("si può chiamare due volte senza creare doppioni", async () => {
    await inTx(async (tx) => {
      await createUser(tx, NEW_USER);
      await tx.as(NEW_USER);
      const [a] = await tx.q<{ register_salon: string }>(`select register_salon()`);
      const [b] = await tx.q<{ register_salon: string }>(`select register_salon()`);
      expect(b!.register_salon).toBe(a!.register_salon);
      expect(await tx.q(`select 1 from salons`)).toHaveLength(1);
    });
  });

  it("senza nome usa la parte prima della @", async () => {
    await inTx(async (tx) => {
      await createUser(tx, NEW_USER, true, null);
      await tx.as(NEW_USER);
      await tx.q(`select register_salon()`);
      const [salon] = await tx.q<{ name: string }>(`select name from salons`);
      expect(salon?.name).toBe("Salone di c0000000");
    });
  });

  it("rifiuta anon e chi non ha verificato l’email", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      expect(await tx.error(`select register_salon()`)).toBe("42501");
      await createUser(tx, NEW_USER, false);
      await tx.as(NEW_USER);
      expect(await tx.error(`select register_salon()`)).toBe("28000");
    });
  });

  it("un nuovo utente non vede nulla di Barberia Saragozza", async () => {
    await inTx(async (tx) => {
      await createUser(tx, NEW_USER);
      await tx.as(NEW_USER);
      await tx.q(`select register_salon()`);
      expect(await tx.q(`select 1 from salons where id = $1`, [SALON])).toHaveLength(0);
      expect(await tx.q(`select 1 from clients_visible where salon_id = $1`, [SALON])).toHaveLength(0);
      expect(await tx.q(`select 1 from appointments where salon_id = $1`, [SALON])).toHaveLength(0);
      expect(await tx.q(`select 1 from members where salon_id = $1`, [SALON])).toHaveLength(0);
    });
  });
});

describe("link del salone", () => {
  it("rifiuta i link riservati alle rotte del sito", async () => {
    await inTx(async (tx) => {
      await tx.as(ANDREA);
      for (const slug of ["accedi", "agenda", "primo-avvio", "api", "dev"]) {
        expect(await tx.error(`update salons set slug = $1 where id = $2`, [slug, SALON]), slug).toBe("23514");
      }
    });
  });

  it("rifiuta maiuscole e caratteri strani", async () => {
    await inTx(async (tx) => {
      await tx.as(ANDREA);
      for (const slug of ["Barberia", "con spazi", "-inizio", "fine-", "a--b", "è"]) {
        expect(await tx.error(`update salons set slug = $1 where id = $2`, [slug, SALON]), slug).toBe("23514");
      }
    });
  });

  it("slug_available distingue liberi e occupati", async () => {
    await inTx(async (tx) => {
      await tx.as(ANDREA);
      const [taken] = await tx.q<{ slug_available: boolean }>(`select slug_available('barberia-saragozza')`);
      const [free] = await tx.q<{ slug_available: boolean }>(`select slug_available('barberia-nuova')`);
      expect(taken?.slug_available).toBe(false);
      expect(free?.slug_available).toBe(true);
    });
  });
});

describe("abbonamento e inviti", () => {
  it("il titolare non cambia piano, stato o prova da solo", async () => {
    await inTx(async (tx) => {
      await tx.as(ANDREA);
      for (const col of ["plan = 'salone'", "sub_status = 'active'", "trial_ends_at = now() + interval '1 year'", "stripe_customer_id = 'x'"]) {
        expect(await tx.error(`update salons set ${col} where id = $1`, [SALON]), col).toBe("42501");
      }
      // le impostazioni del salone, invece, sì
      expect(await tx.q(`update salons set show_prices = false where id = $1 returning id`, [SALON])).toHaveLength(1);
    });
  });

  it("i barbieri non leggono il token d’invito dei colleghi", async () => {
    await inTx(async (tx) => {
      await tx.as(MARCO);
      expect(await tx.error(`select invite_token from members`)).toBe("42501");
      expect(await tx.q(`select * from pending_invites($1)`, [SALON])).toHaveLength(0);
    });
  });

  it("il titolare legge gli inviti in sospeso", async () => {
    await inTx(async (tx) => {
      await tx.as(ANDREA);
      const rows = await tx.q<{ name: string; token: string }>(`select * from pending_invites($1)`, [SALON]);
      expect(rows).toEqual([expect.objectContaining({ name: "Simone", token: "invito-demo-simone" })]);
    });
  });
});
