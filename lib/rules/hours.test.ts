import { describe, expect, it } from "vitest";
import { CLOSED_DAY, dayFromRanges, formatMinutes, parseTime, rangesOf, rangesText, summarizeWeek, toWeek, validateHours, validateRanges, type HoursInput, type WeekDay } from "./hours";

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
    expect(week[2]).toEqual({ closed: false, ranges: [[540, 780], [870, 1140]] });
    expect(week[0]).toEqual({ closed: true, ranges: [] });
    expect(dayFromRanges(week[2]!)).toEqual({ closed: false, openMin: 540, closeMin: 1140, breaks: [[780, 870]] });
  });
});

describe("summarizeWeek", () => {
  it("raggruppa i giorni uguali come nell'anteprima del design", () => {
    expect(summarizeWeek(toWeek(DEFAULT).map(dayFromRanges))).toEqual([
      { label: "Lunedì", value: "Chiuso" },
      { label: "Mar – Sab", value: "9:00–13:00 · 14:30–19:00" },
      { label: "Domenica", value: "Chiuso" },
    ]);
  });

  it("senza pausa e con sette giorni aperti", () => {
    const week = toWeek({ days: [0, 1, 2, 3, 4, 5, 6], openMin: 540, closeMin: 1140, breakMin: null });
    expect(summarizeWeek(week.map(dayFromRanges))).toEqual([{ label: "Lun – Dom", value: "9:00–19:00" }]);
  });
});


describe("fasce di un giorno", () => {
  it("dalle fasce si ricavano apertura, chiusura e pause; senza fasce il giorno è chiuso", () => {
    const three: WeekDay = { closed: false, ranges: [[480, 720], [780, 900], [960, 1200]] };
    expect(dayFromRanges(three)).toEqual({ closed: false, openMin: 480, closeMin: 1200, breaks: [[720, 780], [900, 960]] });
    expect(dayFromRanges({ closed: false, ranges: [] })).toEqual(CLOSED_DAY);
    expect(dayFromRanges({ closed: true, ranges: [[540, 600]] })).toEqual(CLOSED_DAY);
  });

  it("dalla forma del giorno si tornano alle fasce e si scrivono", () => {
    const day = dayFromRanges({ closed: false, ranges: [[540, 780], [870, 1140]] });
    expect(rangesOf(day)).toEqual([[540, 780], [870, 1140]]);
    expect(rangesText(day)).toBe("9:00–13:00 · 14:30–19:00");
    expect(rangesText(CLOSED_DAY)).toBe("Chiuso");
  });

  it("controlla le fasce: almeno una, ben ordinate, senza sovrapposizioni, al massimo quattro", () => {
    expect(validateRanges([])).toBe("empty");
    expect(validateRanges([[600, 600]])).toBe("order");
    expect(validateRanges([[540, 780], [700, 900]])).toBe("overlap");
    expect(validateRanges([[540, 780], [780, 900]])).toBeNull(); // si toccano: nessuna pausa, va bene
    expect(validateRanges([[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]])).toBe("too_many");
    expect(validateRanges([[540, 780], [870, 1140]])).toBeNull();
  });
});
