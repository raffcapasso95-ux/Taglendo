import { describe, expect, it } from "vitest";
import { eurosText, parseEuros, quickPrices } from "./price";

describe("prezzo per il cliente", () => {
  it("legge euro con virgola o punto", () => {
    expect(parseEuros("25")).toBe(2500);
    expect(parseEuros("25,5")).toBe(2550);
    expect(parseEuros(" 12.50 € ")).toBe(1250);
    expect(parseEuros("0")).toBe(0);
  });

  it("rifiuta testo, negativi, troppi decimali e importi enormi", () => {
    for (const bad of ["", "abc", "-5", "1,234", "1e3", "100000"]) expect(parseEuros(bad)).toBeNull();
  });

  it("scrive gli euro come li scrive chi li digita", () => {
    expect(eurosText(2500)).toBe("25");
    expect(eurosText(1250)).toBe("12,50");
    expect(eurosText(0)).toBe("0");
  });

  it("gli sconti rapidi partono dal prezzo di listino", () => {
    expect(quickPrices(3000).map((q) => q.cents)).toEqual([3000, 2700, 2400, 0]);
    expect(quickPrices(1250).map((q) => q.cents)).toEqual([1250, 1125, 1000, 0]);
    expect(quickPrices(3000).map((q) => q.label)).toEqual(["Prezzo pieno", "−10%", "−20%", "Omaggio"]);
  });
});
