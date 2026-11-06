import { describe, expect, it } from "vitest";
import { addMonths, dayLabel, dayLabelShort, isMonthKey, monthBounds, monthChip, monthGrid, monthRange, monthTitle } from "./calendar";

describe("calendario mensile", () => {
  it("somma i mesi anche oltre l'anno", () => {
    expect(addMonths("2026-11", 1)).toBe("2026-12");
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(addMonths("2026-11", 14)).toBe("2028-01");
  });

  it("titolo e scorciatoie in italiano: l'anno compare solo a gennaio", () => {
    expect(monthTitle("2027-03")).toBe("Marzo 2027");
    expect(monthRange("2026-11", 7).map(monthChip)).toEqual(["Nov", "Dic", "Gen 27", "Feb", "Mar", "Apr", "Mag"]);
  });

  it("la griglia parte da lunedì", () => {
    // 1 marzo 2027 è un lunedì: nessun riquadro vuoto; 1 novembre 2026 è una domenica: sei vuoti
    expect(monthGrid("2027-03").lead).toBe(0);
    expect(monthGrid("2026-11").lead).toBe(6);
    expect(monthGrid("2027-03").days).toHaveLength(31);
    expect(monthGrid("2028-02").days).toHaveLength(29); // bisestile
  });

  it("etichette dei giorni", () => {
    expect(dayLabel("2027-03-16")).toBe("Martedì 16 marzo 2027");
    expect(dayLabelShort("2027-03-16")).toBe("martedì 16 marzo");
  });

  it("primo e ultimo giorno, e chiavi valide", () => {
    expect(monthBounds("2026-12")).toEqual({ first: "2026-12-01", last: "2026-12-31" });
    expect(isMonthKey("2026-11")).toBe(true);
    expect(isMonthKey("2026-13")).toBe(false);
    expect(isMonthKey("26-11")).toBe(false);
  });
});
