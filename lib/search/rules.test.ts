import { describe, expect, it } from "vitest";
import { parseSearch, slotChips, slotLabel } from "./rules";

describe("ricerca dei saloni: cosa si cerca", () => {
  it("«Vicino a me» vince sul testo; coordinate strane non valgono", () => {
    expect(parseSearch({ lat: "44.49491", lng: "11.34262", dove: "Roma" })).toEqual({ kind: "point", lat: 44.4949, lng: 11.3426 });
    expect(parseSearch({ lat: "0", lng: "0", dove: " Bologna " })).toEqual({ kind: "text", text: "Bologna" });
    expect(parseSearch({ lat: "abc", lng: "11" })).toEqual({ kind: "none" });
    expect(parseSearch({ dove: ["Napoli", "Roma"] })).toEqual({ kind: "text", text: "Napoli" });
    expect(parseSearch({})).toEqual({ kind: "none" });
  });

  it("il primo orario libero si legge come si dice", () => {
    const now = new Date("2026-11-11T09:00:00Z"); // mercoledì 11, le 10 a Roma
    expect(slotLabel("2026-11-11T14:30:00Z", now)).toBe("oggi alle 15:30");
    expect(slotLabel("2026-11-12T09:00:00Z", now)).toBe("domani alle 10:00");
    expect(slotLabel("2026-11-13T09:00:00Z", now)).toBe("Ven 13 nov, 10:00");
  });
});

describe("i prossimi orari come pulsanti", () => {
  const now = new Date("2026-11-11T09:00:00Z");
  it("il giorno del primo in testa; sugli altri solo se cambia", () => {
    expect(slotChips(["2026-11-11T14:30:00Z", "2026-11-11T15:00:00Z", "2026-11-12T08:00:00Z"], now)).toEqual({
      day: "Oggi",
      chips: [
        { time: "15:30", day: null },
        { time: "16:00", day: null },
        { time: "09:00", day: "Domani" },
      ],
    });
    expect(slotChips([], now)).toEqual({ day: null, chips: [] });
  });
});
