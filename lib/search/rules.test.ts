import { describe, expect, it } from "vitest";
import { dayPhrase, parseFilters, parseSearch, resultsTitle, searchHref, slotChips, slotLabel } from "./rules";

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

describe("servizio e giorno", () => {
  const today = "2026-11-11";
  it("si leggono dall'indirizzo; un giorno passato o troppo lontano non vale", () => {
    expect(parseFilters({ servizio: "  taglio   e barba ", data: "2026-11-14" }, today)).toEqual({ service: "taglio e barba", date: "2026-11-14" });
    expect(parseFilters({ data: "2026-11-10" }, today)).toEqual({ service: null, date: null });
    expect(parseFilters({ data: "2027-06-01" }, today).date).toBeNull();
    expect(parseFilters({ data: "ciao" }, today).date).toBeNull();
  });
  it("l'indirizzo di una ricerca, senza parametri vuoti", () => {
    expect(searchHref({ dove: "Bologna", servizio: "Barba", data: "2026-11-14" })).toBe("/cerca?servizio=Barba&dove=Bologna&data=2026-11-14");
    expect(searchHref({ lat: 44.49491, lng: 11.3426, dove: "x" })).toBe("/cerca?lat=44.4949&lng=11.3426");
    expect(searchHref({ dove: "Bologna", servizio: "" })).toBe("/cerca?dove=Bologna");
  });
  it("il titolo dice cosa, dove e quando", () => {
    expect(resultsTitle({ place: "Bologna", near: false, service: null, date: null, today })).toBe("Barbieri a Bologna");
    expect(resultsTitle({ place: "Bologna", near: false, service: "barba", date: "2026-11-12", today })).toBe("Barba a Bologna · domani");
    expect(resultsTitle({ place: "Bologna", near: true, service: null, date: "2026-11-14", today })).toBe("Barbieri vicino a te · Bologna · sabato 14 novembre");
    expect(dayPhrase(today, today)).toBe("oggi");
  });
});
