import { describe, expect, it } from "vitest";
import {
  ANDREA,
  MARCO,
  MEMBER_ANDREA,
  MEMBER_MARCO,
  SALON,
  SERVICE_TAGLIO,
  createOtherSalon,
  inTx,
} from "./db";

const TABLES = [
  "salons",
  "members",
  "opening_hours",
  "closures",
  "services",
  "clients_visible",
  "appointments",
  "email_prefs",
] as const;

describe("RLS: un salone non vede mai i dati di un altro", () => {
  it("il titolare di un altro salone non legge nulla di Barberia Saragozza", async () => {
    await inTx(async (tx) => {
      const other = await createOtherSalon(tx);
      await tx.as(other.userId);
      for (const t of TABLES) {
        const col = t === "salons" ? "id" : "salon_id";
        const rows = await tx.q(`select 1 from ${t} where ${col} = $1`, [SALON]);
        expect(rows, t).toHaveLength(0);
      }
      // vede invece i propri dati
      const own = await tx.q(`select name from clients_visible`);
      expect(own).toEqual([{ name: "Cliente Altrui" }]);
    });
  });

  it("Andrea vede solo il proprio salone", async () => {
    await inTx(async (tx) => {
      const other = await createOtherSalon(tx);
      await tx.as(ANDREA);
      const salons = await tx.q<{ id: string }>(`select id from salons`);
      expect(salons.map((s) => s.id)).toEqual([SALON]);
      const foreign = await tx.q(`select 1 from clients_visible where salon_id = $1`, [other.salonId]);
      expect(foreign).toHaveLength(0);
    });
  });

  it("non si scrive nei dati di un altro salone", async () => {
    await inTx(async (tx) => {
      const other = await createOtherSalon(tx);
      await tx.as(ANDREA);
      const updated = await tx.q(`update clients set name = 'X' where salon_id = $1 returning id`, [other.salonId]);
      expect(updated).toHaveLength(0);
      const deleted = await tx.q(`delete from services where salon_id = $1 returning id`, [other.salonId]);
      expect(deleted).toHaveLength(0);
      expect(
        await tx.error(`insert into services (salon_id, name, duration_min, price_cents) values ($1, 'Intruso', 30, 100)`, [
          other.salonId,
        ]),
      ).toBe("42501");
    });
  });

  it("non si collega un appuntamento a un cliente di un altro salone", async () => {
    await inTx(async (tx) => {
      const other = await createOtherSalon(tx);
      await tx.as(ANDREA);
      const err = await tx.error(
          `insert into appointments (salon_id, member_id, client_id, service_name, price_cents, starts_at, ends_at, public_code)
           values ($1, $2, $3, 'Taglio', 2000, now() + interval '30 days', now() + interval '30 days 30 minutes', 'TG-T1')`,
          [SALON, MEMBER_ANDREA, other.clientId],
      );
      expect(err).toBe("23503"); // violazione della chiave (client_id, salon_id)
    });
  });

  it("anon non legge nessuna tabella", async () => {
    await inTx(async (tx) => {
      await tx.as(null);
      for (const t of [...TABLES, "clients", "booking_codes"]) {
        const err = await tx.error(`select 1 from ${t} limit 1`);
        expect(err, t).toBe("42501");
      }
    });
  });

  it("booking_codes non è accessibile agli utenti, nemmeno al titolare", async () => {
    await inTx(async (tx) => {
      await tx.as(ANDREA);
      expect(await tx.error(`select 1 from booking_codes`)).toBe("42501");
    });
  });
});

describe("RLS: permessi dei barbieri", () => {
  it("con “vedere l’agenda di tutti” spento, Marco vede solo i suoi appuntamenti", async () => {
    await inTx(async (tx) => {
      await tx.asAdmin();
      await tx.q(`update salons set barbers_see_all = false where id = $1`, [SALON]);
      await tx.as(MARCO);
      const members = await tx.q<{ member_id: string }>(`select distinct member_id from appointments`);
      expect(members).toEqual([{ member_id: MEMBER_MARCO }]);
    });
  });

  it("con il permesso acceso Marco vede tutta l’agenda", async () => {
    await inTx(async (tx) => {
      await tx.as(MARCO);
      const members = await tx.q(`select distinct member_id from appointments`);
      expect(members.length).toBe(3);
    });
  });

  it("senza “vedere telefono ed email” Marco non li legge", async () => {
    await inTx(async (tx) => {
      await tx.as(MARCO);
      const rows = await tx.q<{ phone: string | null; email: string | null }>(
        `select phone, email from clients_visible`,
      );
      expect(rows.length).toBe(13);
      expect(rows.every((r) => r.phone === null && r.email === null)).toBe(true);
      // e non può aggirare la vista leggendo la tabella
      expect(await tx.error(`select phone from clients`)).toBe("42501");
    });
  });

  it("con il permesso acceso Marco legge i contatti", async () => {
    await inTx(async (tx) => {
      await tx.asAdmin();
      await tx.q(`update salons set barbers_contacts = true where id = $1`, [SALON]);
      await tx.as(MARCO);
      const [luca] = await tx.q<{ phone: string }>(`select phone from clients_visible where name = 'Luca Rossi'`);
      expect(luca?.phone).toBe("+39 333 412 8890");
    });
  });

  it("il titolare legge sempre i contatti", async () => {
    await inTx(async (tx) => {
      await tx.as(ANDREA);
      const [luca] = await tx.q<{ email: string }>(`select email from clients_visible where name = 'Luca Rossi'`);
      expect(luca?.email).toBe("luca.rossi@example.com");
    });
  });

  it("listino, orari e regole li modifica solo il titolare", async () => {
    await inTx(async (tx) => {
      await tx.as(MARCO);
      expect(await tx.q(`update services set price_cents = 1 returning id`)).toHaveLength(0);
      expect(await tx.q(`update opening_hours set closed = true returning weekday`)).toHaveLength(0);
      expect(await tx.q(`update salons set show_prices = false returning id`)).toHaveLength(0);
      await tx.as(ANDREA);
      expect(await tx.q(`update services set price_cents = 2100 where id = $1 returning id`, [SERVICE_TAGLIO])).toHaveLength(1);
    });
  });

  it("senza “fissare e spostare” Marco non crea appuntamenti", async () => {
    await inTx(async (tx) => {
      await tx.asAdmin();
      await tx.q(`update salons set barbers_edit = false where id = $1`, [SALON]);
      await tx.as(MARCO);
      const err = await tx.error(
          `insert into appointments (salon_id, member_id, service_name, price_cents, starts_at, ends_at, public_code)
           values ($1, $2, 'Taglio', 2000, now() + interval '30 days', now() + interval '30 days 30 minutes', 'TG-T2')`,
          [SALON, MEMBER_MARCO],
      );
      expect(err).toBe("42501");
    });
  });
});
