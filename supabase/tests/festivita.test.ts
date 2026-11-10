import { describe, expect, it } from "vitest";
import { ANDREA, MARCO, SALON, createTestSalon, inTx } from "./db";

describe("festività", () => {
  it("solo il titolare sceglie le feste e il patrono; il barbiere non cambia niente", async () => {
    await inTx(async (tx) => {
      const read = async () => (await tx.q<{ closed_holidays: string[]; patron_day: string | null }>(`select closed_holidays, patron_day from salons where id = $1`, [SALON]))[0];
      await tx.as(ANDREA);
      await tx.q(`update salons set closed_holidays = '{}', patron_day = null where id = $1`, [SALON]);
      await tx.as(MARCO);
      await tx.q(`update salons set closed_holidays = '{natale}', patron_day = '09-19' where id = $1`, [SALON]);
      await tx.as(ANDREA);
      expect(await read()).toEqual({ closed_holidays: [], patron_day: null });
      await tx.q(`update salons set closed_holidays = '{pasquetta}', patron_day = '09-19', patron_name = 'San Gennaro' where id = $1`, [SALON]);
      expect(await read()).toEqual({ closed_holidays: ["pasquetta"], patron_day: "09-19" });
    });
  });

  it("giorno del patrono scritto male: rifiutato", async () => {
    await inTx(async (tx) => {
      await tx.as(ANDREA);
      expect(await tx.error(`update salons set patron_day = '19-09' where id = $1`, [SALON])).toBe("23514");
    });
  });

  it("la stessa festa nello stesso giorno non si duplica; le chiusure della festa sono di tutto il salone", async () => {
    await inTx(async (tx) => {
      const s = await createTestSalon(tx);
      await tx.as(s.userId);
      await tx.q(`insert into closures (salon_id, holiday, starts_on, ends_on, note) values ($1, 'natale', '2027-12-25', '2027-12-25', 'Natale')`, [s.salonId]);
      expect(await tx.error(`insert into closures (salon_id, holiday, starts_on, ends_on, note) values ($1, 'natale', '2027-12-25', '2027-12-25', 'Natale')`, [s.salonId])).toBe("23505");
      // il giorno chiuso non ha orari liberi
      const rows = await tx.q(`select * from free_slots($1, $2, null, '2027-12-25'::date, 1)`, [s.salonId, s.serviceId]);
      expect(rows).toHaveLength(0);
    });
  });
});
