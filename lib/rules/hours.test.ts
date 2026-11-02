import { describe, expect, it } from "vitest";
import { formatMinutes, parseTime, summarizeWeek, toWeek, validateHours, type HoursInput } from "./hours";

const DEFAULT: HoursInput = { days: [2, 3, 4, 5, 6], openMin: 540, closeMin: 1140, breakMin: { start: 780, end: 870 } };

describe("parseTime / formatMinutes", () => {
  it("legge orari con o senza zero", () => {
    expect(parseTime("9:00")).toBe(540);
    expect(parseTime("09:00")).toBe(540);
    expect(parseTime("14.30")).toBe(870);
    expect(parseTime("24:00")).toBe(1440);
  });

  it("rifiuta orari impossibili", () => {
    for (const bad of ["", "9", "25:00", "9:60", "24:30", "ab:cd", "9:0"]) expect(parseTime(bad), bad).toBeNull();
  });

  it("scrive come nei design", () => {
    expect(formatMinutes(540)).toBe("9:00");
    expect(formatMinutes(870)).toBe("14:30");
  });
});

describe("validateHours", () => {
  it("accetta gli orari predefiniti", () => {
    expect(validateHours(DEFAULT)).toBeNull();
  });

  it("senza pausa va bene", () => {
    expect(validateHours({ ...DEFAULT, breakMin: null })).toBeNull();
  });

  it("segnala gli errori", () => {
    expect(validateHours({ ...DEFAULT, days: [] })).toBe("no_days");
    expect(validateHours({ ...DEFAULT, openMin: 1140, closeMin: 540 })).toBe("open_after_close");
    expect(validateHours({ ...DEFAULT, openMin: 600, closeMin: 600 })).toBe("open_after_close");
    expect(validateHours({ ...DEFAULT, breakMin: { start: 870, end: 780 } })).toBe("break_invalid");
    expect(validateHours({ ...DEFAULT, breakMin: { start: 500, end: 600 } })).toBe("break_outside");
    expect(validateHours({ ...DEFAULT, breakMin: { start: 1100, end: 1200 } })).toBe("break_outside");
  });

  it("la pausa può toccare apertura e chiusura", () => {
    expect(validateHours({ ...DEFAULT, breakMin: { start: 540, end: 600 } })).toBeNull();
  });
});

describe("toWeek", () => {
  it("mette chiusi i giorni non scelti (0 = domenica)", () => {
    const week = toWeek(DEFAULT);
    expect(week.map((d) => d.closed)).toEqual([true, true, false, false, false, false, false]);
    expect(week[2]).toEqual({ closed: false, openMin: 540, closeMin: 1140, breakStartMin: 780, breakEndMin: 870 });
    expect(week[0]).toEqual({ closed: true, openMin: null, closeMin: null, breakStartMin: null, breakEndMin: null });
  });
});

describe("summarizeWeek", () => {
  it("raggruppa i giorni uguali come nell'anteprima del design", () => {
    expect(summarizeWeek(toWeek(DEFAULT))).toEqual([
      { label: "Lunedì", value: "Chiuso" },
      { label: "Mar – Sab", value: "9:00–13:00 · 14:30–19:00" },
      { label: "Domenica", value: "Chiuso" },
    ]);
  });

  it("senza pausa e con sette giorni aperti", () => {
    const week = toWeek({ days: [0, 1, 2, 3, 4, 5, 6], openMin: 540, closeMin: 1140, breakMin: null });
    expect(summarizeWeek(week)).toEqual([{ label: "Lun – Dom", value: "9:00–19:00" }]);
  });
});
