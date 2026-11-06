import { describe, expect, it } from "vitest";
import { gridSlots, nearestAlternatives, type Candidate } from "./slots";
import { reminderText, whatsappLink, whatsappNumber } from "./whatsapp";
import type { DayHours } from "./agenda";

const HOURS: DayHours = { closed: false, openMin: 540, closeMin: 1140, breaks: [[780, 870]] };

describe("gridSlots", () => {
  it("tutti gli orari possibili, con i liberi segnati", () => {
    const grid = gridSlots(HOURS, 30, new Set([540, 555]));
    expect(grid[0]).toEqual({ startMin: 540, free: true });
    expect(grid[1]).toEqual({ startMin: 555, free: true });
    expect(grid[2]).toEqual({ startMin: 570, free: false });
    const starts = grid.map((g) => g.startMin);
    expect(starts).toContain(750); // 12:30, finisce alle 13:00
    expect(starts).not.toContain(765); // 12:45, finirebbe dentro la pausa
    expect(starts).toContain(870);
    expect(starts.at(-1)).toBe(1110); // 18:30
  });

  it("per oggi taglia il passato; giorno chiuso: niente", () => {
    expect(gridSlots(HOURS, 30, new Set(), 600)[0]!.startMin).toBe(600);
    expect(gridSlots({ ...HOURS, closed: true }, 30, new Set())).toEqual([]);
  });
});

describe("nearestAlternatives", () => {
  const c = (date: string, startMin: number, memberId = "a"): Candidate => ({ date, startMin, memberId });

  it("prima gli orari più vicini dello stesso giorno, al massimo 2 per giorno", () => {
    const alt = nearestAlternatives(
      [c("2026-11-05", 600), c("2026-11-05", 615), c("2026-11-05", 630), c("2026-11-05", 900), c("2026-11-06", 600)],
      { date: "2026-11-05", startMin: 620 },
    );
    expect(alt.map((x) => `${x.date} ${x.startMin}`)).toEqual(["2026-11-05 615", "2026-11-05 630", "2026-11-06 600"]);
  });

  it("non ripropone l'orario conteso e unisce lo stesso orario di barbieri diversi", () => {
    const alt = nearestAlternatives(
      [c("2026-11-05", 600, "a"), c("2026-11-05", 600, "b"), c("2026-11-05", 620, "a")],
      { date: "2026-11-05", startMin: 620 },
    );
    expect(alt).toEqual([c("2026-11-05", 600, "a")]);
  });

  it("senza candidati, nessuna alternativa", () => {
    expect(nearestAlternatives([], { date: "2026-11-05", startMin: 600 })).toEqual([]);
  });
});

describe("WhatsApp", () => {
  it("numero con prefisso del paese", () => {
    expect(whatsappNumber("+39 333 412 8890")).toBe("393334128890");
    expect(whatsappNumber("333 412 8890")).toBe("393334128890");
    expect(whatsappNumber("051 644 2190")).toBe("390516442190");
    expect(whatsappNumber("0039 333 412 8890")).toBe("393334128890");
    expect(whatsappNumber("+44 7700 900123")).toBe("447700900123");
    expect(whatsappNumber("")).toBeNull();
    expect(whatsappNumber(null)).toBeNull();
    expect(whatsappNumber("12")).toBeNull();
  });

  it("link e testo del promemoria", () => {
    const text = reminderText({ clientName: "Luca Rossi", dayLabel: "di oggi", time: "10:30", salonName: "Barberia Saragozza" });
    expect(text).toBe("Ciao Luca, ti ricordo l’appuntamento di oggi alle 10:30 da Barberia Saragozza.");
    expect(whatsappLink("+39 333 412 8890", text)).toBe(`https://wa.me/393334128890?text=${encodeURIComponent(text)}`);
    expect(whatsappLink(null, text)).toBeNull();
  });
});
