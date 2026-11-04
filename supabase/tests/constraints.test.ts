import { describe, expect, it } from "vitest";
import { MEMBER_ANDREA, MEMBER_MARCO, SALON, inTx } from "./db";

const insertAppt = `
  insert into appointments (salon_id, member_id, service_name, price_cents, starts_at, ends_at, status, cancelled_by, public_code)
  values ($1, $2, 'Taglio uomo', 2000, $3, $4, $5, $6, $7)`;

// un martedì lontano, ora di Roma
const at = (hhmm: string) => `2027-03-02 ${hhmm}:00 Europe/Rome`;

describe("vincoli del database", () => {
  it("rifiuta due appuntamenti confermati sovrapposti per lo stesso operatore", async () => {
    await inTx(async (tx) => {
      await tx.q(insertAppt, [SALON, MEMBER_ANDREA, at("10:00"), at("10:30"), "confermato", null, "TG-C1"]);
      const err = await tx.error(insertAppt, [SALON, MEMBER_ANDREA, at("10:15"), at("10:45"), "confermato", null, "TG-C2"]);
      expect(err).toBe("23P01"); // exclusion_violation
    });
  });

  it("accetta appuntamenti attaccati (fine = inizio) e su operatori diversi", async () => {
    await inTx(async (tx) => {
      await tx.q(insertAppt, [SALON, MEMBER_ANDREA, at("10:00"), at("10:30"), "confermato", null, "TG-C3"]);
      await tx.q(insertAppt, [SALON, MEMBER_ANDREA, at("10:30"), at("11:00"), "confermato", null, "TG-C4"]);
      await tx.q(insertAppt, [SALON, MEMBER_MARCO, at("10:00"), at("10:30"), "confermato", null, "TG-C5"]);
    });
  });

  it("un appuntamento annullato libera l’orario", async () => {
    await inTx(async (tx) => {
      await tx.q(insertAppt, [SALON, MEMBER_ANDREA, at("10:00"), at("10:30"), "annullato", "cliente", "TG-C6"]);
      await tx.q(insertAppt, [SALON, MEMBER_ANDREA, at("10:00"), at("10:30"), "confermato", null, "TG-C7"]);
    });
  });

  it("rifiuta durate nulle o negative", async () => {
    await inTx(async (tx) => {
      const err = await tx.error(insertAppt, [SALON, MEMBER_ANDREA, at("10:30"), at("10:00"), "confermato", null, "TG-C8"]);
      expect(err).toBe("23514");
    });
  });

  it("limiti dei campi: nome salone oltre 60 caratteri, descrizione oltre 160", async () => {
    await inTx(async (tx) => {
      expect(await tx.error(`update salons set name = repeat('a', 61) where id = $1`, [SALON])).toBe("23514");
      expect(await tx.error(`update salons set description = repeat('a', 161) where id = $1`, [SALON])).toBe("23514");
    });
  });

  it("al massimo 3 poltrone", async () => {
    await inTx(async (tx) => {
      const err = await tx.error(`insert into members (salon_id, name, chair_no) values ($1, 'Nicolò', 4)`, [SALON]);
      expect(err).toBe("23514");
    });
  });
});

describe("seed Barberia Saragozza", () => {
  it("contiene i dati demo del prototipo", async () => {
    await inTx(async (tx) => {
      const [counts] = await tx.q<Record<string, string>>(`
        select (select count(*) from members where salon_id = '${SALON}') as members,
               (select count(*) from services where salon_id = '${SALON}') as services,
               (select count(*) from clients where salon_id = '${SALON}') as clients`);
      expect(counts).toEqual({ members: "3", services: "5", clients: "13" });

      const [visits] = await tx.q<{ n: string }>(
        `select count(*) as n from appointments a join clients c on c.id = a.client_id
         where c.name = 'Antonio Esposito' and a.status = 'completato'`,
      );
      expect(visits?.n).toBe("40");

      // il giorno più pieno del seed è un giorno di apertura con 15 appuntamenti (le prove e2e ne aggiungono altri al più sparsi)
      const [day0] = await tx.q<{ dow: number; n: string }>(`
        select extract(dow from d)::int as dow, count(*) as n
        from (select (starts_at at time zone 'Europe/Rome')::date as d from appointments
              where salon_id = '5a100000-0000-4000-8000-000000000001') x
        group by d order by count(*) desc, d limit 1`);
      expect(day0?.dow).toBeGreaterThanOrEqual(2);
      expect(Number(day0?.n)).toBeGreaterThanOrEqual(15);
    });
  });
});
