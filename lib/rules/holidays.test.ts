import { describe, expect, it } from "vitest";
import { easter, holidayDate, holidayName, holidayPlan, upcomingHolidays, wantedHolidayClosures } from "./holidays";

describe("festività", () => {
  it("Pasqua e Pasquetta cadono nel giorno giusto", () => {
    expect(easter(2025)).toBe("2025-04-20");
    expect(easter(2026)).toBe("2026-04-05");
    expect(easter(2027)).toBe("2027-03-28");
    expect(easter(2028)).toBe("2028-04-16");
    expect(holidayDate("pasquetta", 2026)).toBe("2026-04-06");
    expect(holidayDate("pasquetta", 2027)).toBe("2027-03-29");
  });

  it("le feste fisse e il santo patrono", () => {
    expect(holidayDate("natale", 2026)).toBe("2026-12-25");
    expect(holidayDate("san_francesco", 2026)).toBe("2026-10-04");
    expect(holidayDate("patrono", 2026, { day: "09-19", name: "San Gennaro" })).toBe("2026-09-19");
    expect(holidayDate("patrono", 2026, null)).toBeNull();
    expect(holidayDate("patrono", 2027, { day: "02-29", name: null })).toBeNull(); // non bisestile: salta
    expect(holidayName("patrono", { day: "09-19", name: " " })).toBe("Santo patrono");
  });

  it("l'elenco parte dalla festa più vicina; quelle già passate tornano l'anno dopo", () => {
    const list = upcomingHolidays("2026-11-10", { day: "10-04", name: "San Petronio" });
    expect(list.slice(0, 4).map((h) => `${h.key} ${h.date}`)).toEqual(["immacolata 2026-12-08", "natale 2026-12-25", "santo_stefano 2026-12-26", "capodanno 2027-01-01"]);
    expect(list.find((h) => h.key === "pasqua")!.date).toBe("2027-03-28");
    expect(list.find((h) => h.key === "patrono")).toMatchObject({ name: "San Petronio", date: "2027-10-04" });
    expect(list).toHaveLength(14);
  });

  it("le chiusure servono da oggi alla fine dell'anno prossimo", () => {
    const wanted = wantedHolidayClosures(["natale", "pasquetta", "sconosciuta"], null, "2026-11-10");
    expect(wanted.map((w) => w.date)).toEqual(["2026-12-25", "2027-03-29", "2027-12-25"]);
  });

  it("si toglie ciò che non serve più, si aggiunge ciò che manca, il passato non si tocca", () => {
    const today = "2026-11-10";
    const wanted = wantedHolidayClosures(["natale", "patrono"], { day: "12-08", name: "Sant'Ambrogio" }, today);
    const plan = holidayPlan(
      [
        { id: "vecchio", holiday: "natale", startsOn: "2025-12-25", note: "Natale" },
        { id: "n26", holiday: "natale", startsOn: "2026-12-25", note: "Natale" },
        { id: "fer", holiday: "ferragosto", startsOn: "2027-08-15", note: "Ferragosto" },
        { id: "pat", holiday: "patrono", startsOn: "2026-12-08", note: "Santo patrono" },
      ],
      wanted,
      today,
    );
    expect(plan.remove).toEqual(["fer"]);
    expect(plan.add.map((a) => `${a.key} ${a.date}`)).toEqual(["patrono 2027-12-08", "natale 2027-12-25"]);
    expect(plan.rename).toEqual([{ id: "pat", note: "Sant'Ambrogio" }]);
  });
});
