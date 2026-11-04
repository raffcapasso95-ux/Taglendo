import { describe, expect, it } from "vitest";
import { hasBreak, openDaysLabel, outsideHours, previewText, setBreak, stepHours, toggleDay, type HoursDraft } from "./listino";

const D: HoursDraft = { closedDays: [0, 1], open: 540, close: 1140, breakStart: 780, breakEnd: 870 };

describe("stepHours", () => {
  it("apertura e chiusura vanno di 30 minuti, la pausa di 15", () => {
    expect(stepHours(D, "open", 30).open).toBe(570);
    expect(stepHours(D, "close", -30).close).toBe(1110);
    expect(stepHours(D, "breakStart", 15).breakStart).toBe(795);
  });

  it("rispetta i limiti: non prima delle 6:00, non dopo le 22:00, almeno due ore aperto", () => {
    expect(stepHours({ ...D, open: 360 }, "open", -30).open).toBe(360);
    expect(stepHours({ ...D, close: 1320 }, "close", 30).close).toBe(1320);
    expect(stepHours({ ...D, open: 1010 }, "open", 30).open).toBe(1020); // chiude alle 19:00: al massimo apre alle 17:00
    expect(stepHours({ ...D, close: 660 }, "close", -30).close).toBe(660); // aperto dalle 9:00: chiude almeno alle 11:00
  });

  it("la pausa resta dentro l'orario e almeno 15 minuti", () => {
    expect(stepHours({ ...D, breakStart: 840, breakEnd: 855 }, "breakStart", 15).breakStart).toBe(840);
    expect(stepHours({ ...D, breakEnd: 1110 }, "breakEnd", 15).breakEnd).toBe(1110); // fino a chiusura - 30
    expect(stepHours(D, "breakStart", -1000).breakStart).toBe(570); // non prima di apertura + 30
  });
});

describe("giorni e pausa", () => {
  it("apre e chiude un giorno, ma non tutti e sette", () => {
    expect(toggleDay(D, 2).closedDays).toEqual([0, 1, 2]);
    expect(toggleDay(D, 0).closedDays).toEqual([1]);
    const sixClosed = { ...D, closedDays: [0, 1, 2, 3, 4, 5] };
    expect(toggleDay(sixClosed, 6)).toBe(sixClosed);
  });

  it("accende la pausa verso le 13:00 e la toglie", () => {
    const none = setBreak(D, false);
    expect(hasBreak(none)).toBe(false);
    expect(setBreak(none, true)).toMatchObject({ breakStart: 780, breakEnd: 870 });
    expect(setBreak({ ...none, open: 720, close: 900 }, true)).toMatchObject({ breakStart: 780, breakEnd: 870 });
    expect(setBreak(D, true)).toBe(D);
  });
});

describe("anteprima e giorni", () => {
  it("anteprima con e senza pausa", () => {
    expect(previewText(D)).toBe("Nuovo orario: 9:00–19:00, pausa 13:00–14:30. Agenda e link si aggiornano quando salvi.");
    expect(previewText(setBreak(D, false))).toBe("Nuovo orario: 9:00–19:00, orario continuato. Agenda e link si aggiornano quando salvi.");
  });

  it("giorni aperti raggruppati", () => {
    expect(openDaysLabel([0, 1])).toBe("Mar – Sab");
    expect(openDaysLabel([])).toBe("Lun – Dom");
    expect(openDaysLabel([0, 1, 3])).toBe("Mar, Gio – Sab");
    expect(openDaysLabel([2, 3, 4, 5, 6, 0])).toBe("Lun");
  });
});

describe("outsideHours", () => {
  const appt = (weekday: number, startMin: number, endMin: number) => ({ weekday, startMin, endMin });

  it("conta giorno chiuso, fuori apertura e dentro la pausa", () => {
    const newHours: HoursDraft = { closedDays: [0, 1, 6], open: 600, close: 1080, breakStart: 780, breakEnd: 870 };
    expect(outsideHours([appt(2, 660, 690)], newHours)).toBe(0); // dentro
    expect(outsideHours([appt(6, 660, 690)], newHours)).toBe(1); // sabato ora chiuso
    expect(outsideHours([appt(2, 570, 600)], newHours)).toBe(1); // prima dell'apertura
    expect(outsideHours([appt(2, 1060, 1100)], newHours)).toBe(1); // finisce dopo la chiusura
    expect(outsideHours([appt(2, 800, 830)], newHours)).toBe(1); // in pausa
    expect(outsideHours([appt(2, 750, 780)], newHours)).toBe(0); // finisce all'inizio della pausa
  });
});
