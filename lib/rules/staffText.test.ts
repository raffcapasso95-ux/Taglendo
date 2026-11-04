import { describe, expect, it } from "vitest";
import { cancelledLine, dayWord, dueJobs, newBookingLine, receives, summaryLines } from "./staffText";

describe("avvisi al barbiere", () => {
  it("parole per il giorno", () => {
    expect(dayWord("2026-11-05", "2026-11-05")).toBe("oggi");
    expect(dayWord("2026-11-06", "2026-11-05")).toBe("domani");
    expect(dayWord("2026-10-30", "2026-10-29")).toBe("domani");
    expect(dayWord("2026-10-30", "2026-10-27")).toBe("ven 30");
  });
  it("righe come in D5", () => {
    expect(newBookingLine({ client: "Luca Rossi", date: "2026-10-30", today: "2026-10-27", startMin: 630, service: "Taglio e barba", barber: "Marco" })).toBe("Luca Rossi · ven 30, 10:30 · Taglio e barba con Marco");
    expect(newBookingLine({ client: "Luca Rossi", date: "2026-10-30", today: "2026-10-27", startMin: 630, service: "Taglio", barber: null })).toBe("Luca Rossi · ven 30, 10:30 · Taglio");
    expect(cancelledLine({ client: "Davide Ferri", date: "2026-10-29", today: "2026-10-29", startMin: 930, free: "l’orario è di nuovo libero" })).toBe("Davide Ferri · oggi 15:30 · l’orario è di nuovo libero");
  });
  it("riepilogo ordinato, con il resto accorpato", () => {
    const items = Array.from({ length: 14 }, (_, i) => ({ startMin: 1000 - i * 10, client: `C${i}`, service: "Taglio" }));
    const lines = summaryLines(items, 12);
    expect(lines).toHaveLength(13);
    expect(lines[0]).toBe("14:30 C13 · Taglio");
    expect(lines.at(-1)).toBe("e altri 2");
    expect(summaryLines([])).toEqual([]);
  });
  it("chi riceve cosa", () => {
    expect(receives({ role: "barber", onlyMine: false, isMine: false })).toBe(false);
    expect(receives({ role: "barber", onlyMine: false, isMine: true })).toBe(true);
    expect(receives({ role: "owner", onlyMine: false, isMine: false })).toBe(true);
    expect(receives({ role: "owner", onlyMine: true, isMine: false })).toBe(false);
    expect(receives({ role: "owner", onlyMine: true, isMine: true })).toBe(true);
  });
  it("quando partono i lavori programmati", () => {
    expect(dueJobs(8)).toEqual({ summaries: true, reminders: false });
    expect(dueJobs(18)).toEqual({ summaries: false, reminders: true });
    expect(dueJobs(20)).toEqual({ summaries: false, reminders: true });
    expect(dueJobs(14)).toEqual({ summaries: false, reminders: false });
    expect(dueJobs(7)).toEqual({ summaries: false, reminders: false });
  });
});
