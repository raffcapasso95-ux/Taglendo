import { describe, expect, it } from "vitest";
import type { DayHours } from "./hours";
import { fromPriceCents, hoursLines, mapsHref, openSign, phoneHref, shortHours, typicalHoursLine } from "./publicPage";

const closed: DayHours = { closed: true, openMin: null, closeMin: null, breaks: [] };
const open: DayHours = { closed: false, openMin: 540, closeMin: 1140, breaks: [[780, 870]] };
// come Barberia Saragozza: domenica e lunedì chiuso, mar–sab 9–13 e 14:30–19
const week = [closed, closed, open, open, open, open, open];

describe("pagina pubblica", () => {
  it("telefono e mappe", () => {
    expect(phoneHref("051 644 2190")).toBe("tel:+390516442190");
    expect(phoneHref("+39 333 1234567")).toBe("tel:+393331234567");
    expect(mapsHref("Via Saragozza 48", "Bologna")).toContain("Via%20Saragozza%2048%2C%20Bologna");
    expect(mapsHref(null, null)).toBeNull();
  });
  it("riga breve e riga con pausa", () => {
    expect(shortHours(week)).toBe("Mar–Sab · 9–19");
    expect(typicalHoursLine(week)).toBe("Mar–Sab · 9–13 e 14:30–19");
    expect(shortHours([closed, closed, closed, closed, closed, closed, closed])).toBe("");
  });
  it("righe degli orari da lunedì a domenica", () => {
    const lines = hoursLines(week, 3);
    expect(lines.map((l) => l.day)).toEqual(["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]);
    expect(lines[0]!.time).toBe("Chiuso");
    expect(lines[1]!.time).toBe("9:00–13:00 · 14:30–19:00");
    expect(lines.filter((l) => l.today).map((l) => l.day)).toEqual(["Mercoledì"]);
  });
  it("cartello aperto, in pausa, prima dell'apertura, dopo la chiusura", () => {
    expect(openSign(week, 3, 10 * 60)).toEqual({ open: true, title: "Aperto", line: "oggi fino alle 13:00" });
    expect(openSign(week, 3, 15 * 60)).toEqual({ open: true, title: "Aperto", line: "oggi fino alle 19:00" });
    expect(openSign(week, 3, 13 * 60 + 30)).toEqual({ open: false, title: "Pausa", line: "riapriamo alle 14:30" });
    expect(openSign(week, 3, 8 * 60)).toEqual({ open: false, title: "Chiuso", line: "apriamo alle 9:00" });
    expect(openSign(week, 3, 20 * 60)).toEqual({ open: false, title: "Chiuso", line: "riapriamo domani alle 9:00" });
  });
  it("giorno di riposo: dice quando riapre", () => {
    expect(openSign(week, 1, 10 * 60)).toEqual({ open: false, title: "Chiuso", line: "riapriamo domani alle 9:00" });
    expect(openSign(week, 6, 20 * 60)).toEqual({ open: false, title: "Chiuso", line: "riapriamo martedì alle 9:00" });
  });
  it("prezzo di partenza", () => {
    expect(fromPriceCents([{ priceCents: 2000 }, { priceCents: 1200 }])).toBe(1200);
    expect(fromPriceCents([])).toBeNull();
  });
});
