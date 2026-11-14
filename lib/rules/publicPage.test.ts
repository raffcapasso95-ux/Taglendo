import { describe, expect, it } from "vitest";
import { CLOSED_DAY, dayFromRanges, type DayHours } from "./hours";
import { barbersLine, closedDaysLine, fromPriceCents, hoursLines, knowRows, mapsHref, openSign, phoneHref, shortHours, statusPill, todayLine, typicalHoursLine, zoneOf } from "./publicPage";

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

describe("pagina del salone (ridisegno del sito)", () => {
  // Mar–Sab 9:00–13:00 e 14:30–19:30; domenica e lunedì chiuso
  const open = dayFromRanges({ closed: false, ranges: [[540, 780], [870, 1170]] });
  const week = [CLOSED_DAY, CLOSED_DAY, open, open, open, open, open];

  it("pillola di stato: aperto, in pausa, prima dell'apertura, dopo la chiusura", () => {
    expect(statusPill(week, 2, 600)).toEqual({ open: true, text: "Aperto ora · chiude alle 13:00", short: "Aperto · chiude alle 13:00" });
    expect(statusPill(week, 2, 800).text).toBe("In pausa · riapre alle 14:30");
    expect(statusPill(week, 2, 480).text).toBe("Chiuso · apre alle 9:00");
    expect(statusPill(week, 2, 1200).text).toBe("Chiuso · riapre domani alle 9:00");
    expect(statusPill(week, 6, 1200).text).toBe("Chiuso · riapre martedì alle 9:00");
    expect(statusPill(Array(7).fill(CLOSED_DAY), 2, 600)).toMatchObject({ open: false, text: "Chiuso" });
  });

  it("orario di oggi e giorni di chiusura", () => {
    expect(todayLine(week, 3)).toBe("Oggi 9:00–19:30");
    expect(todayLine(week, 0)).toBe("Oggi chiuso");
    expect(closedDaysLine(week)).toBe("Chiuso dom. e lun.");
    expect(closedDaysLine(Array(7).fill(open))).toBe("Aperto tutti i giorni");
    expect(closedDaysLine([open, open, open, CLOSED_DAY, open, open, open])).toBe("Chiuso mer.");
  });

  it("barbieri: numero e nomi", () => {
    expect(barbersLine(["Chiara", "Fabio", "Kevin"])).toEqual({ count: "3 barbieri", names: "Chiara, Fabio e Kevin" });
    expect(barbersLine(["Marco"])).toEqual({ count: "1 barbiere", names: "Marco" });
  });

  it("«Da sapere»: solo le righe compilate, disdette dalle regole; niente righe se il salone non ha scritto nulla", () => {
    const empty = { specialties: null, paymentMethods: [], products: null, kidsUntil: null, stepFreeAccess: null, cancelOnline: true, cancelLimitMin: 120 };
    expect(knowRows(empty)).toEqual([]);
    expect(knowRows({ ...empty, specialties: " Sfumature ", paymentMethods: ["bancomat", "contanti", "carta"], kidsUntil: 12, stepFreeAccess: true })).toEqual([
      { label: "Specialità", value: "Sfumature" },
      { label: "Pagamento", value: "In salone: contanti, carta e bancomat" },
      { label: "Bambini", value: "Sì, fino a 12 anni" },
      { label: "Accesso", value: "Ingresso senza gradini" },
      { label: "Disdette", value: "Gratis fino a 2 ore prima" },
    ]);
    expect(knowRows({ ...empty, products: "Proraso", cancelLimitMin: 1440 }).at(-1)).toEqual({ label: "Disdette", value: "Gratis fino a 24 ore prima" });
    expect(knowRows({ ...empty, products: "Proraso", cancelOnline: false }).at(-1)).toEqual({ label: "Disdette", value: "Solo al telefono" });
  });

  it("zona per il percorso", () => {
    expect(zoneOf("Porta Nuova · Torino", "Torino")).toBe("Porta Nuova");
    expect(zoneOf("Torino", "Torino")).toBeNull();
    expect(zoneOf(null, "Torino")).toBeNull();
  });
});
