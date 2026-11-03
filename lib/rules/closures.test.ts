import { describe, expect, it } from "vitest";
import { closureRangeLabel, isPastClosure, splitClosures } from "./closures";

describe("closureRangeLabel", () => {
  it("un giorno solo, con il giorno della settimana", () => {
    expect(closureRangeLabel("2026-11-19", "2026-11-19", 2026)).toBe("Gio 19 novembre");
    expect(closureRangeLabel("2026-11-01", "2026-11-01", 2026)).toBe("Dom 1 novembre");
  });

  it("più giorni nello stesso mese", () => {
    expect(closureRangeLabel("2027-08-09", "2027-08-23", 2026)).toBe("9 – 23 agosto 2027");
    expect(closureRangeLabel("2026-08-09", "2026-08-23", 2026)).toBe("9 – 23 agosto");
  });

  it("a cavallo di due mesi o di due anni", () => {
    expect(closureRangeLabel("2026-12-24", "2027-01-01", 2026)).toBe("24 dic – 1 gennaio 2027");
    expect(closureRangeLabel("2026-10-30", "2026-11-02", 2026)).toBe("30 ott – 2 novembre");
    expect(closureRangeLabel("2027-12-24", "2028-01-01", 2027)).toBe("24 dic – 1 gennaio 2028");
  });
});

describe("chiusure passate e in programma", () => {
  const row = (id: string, startsOn: string, endsOn: string) => ({ id, startsOn, endsOn, memberId: null, note: null });

  it("passata solo se finita prima di oggi", () => {
    expect(isPastClosure("2026-11-02", "2026-11-03")).toBe(true);
    expect(isPastClosure("2026-11-03", "2026-11-03")).toBe(false); // finisce oggi: ancora in corso
  });

  it("le divide e le ordina", () => {
    const { upcoming, past } = splitClosures(
      [row("b", "2026-12-24", "2027-01-01"), row("p1", "2026-10-01", "2026-10-02"), row("a", "2026-11-19", "2026-11-19"), row("p2", "2026-11-01", "2026-11-01")],
      "2026-11-03",
    );
    expect(upcoming.map((r) => r.id)).toEqual(["a", "b"]);
    expect(past.map((r) => r.id)).toEqual(["p2", "p1"]);
  });
});
