import { describe, expect, it } from "vitest";
import { parseSearch, slotLabel } from "./rules";

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
