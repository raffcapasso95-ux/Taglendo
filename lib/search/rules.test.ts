import { describe, expect, it } from "vitest";
import { NO_FILTERS, activeTags, clockLabel, countFilters, dayPhrase, kmLabel, pageNumbers, pinLabel, isNarrowed, isOn, parseFilters, parseSearch, resetFilters, resultsTitle, searchHref, slotChips, slotLabel, toggleFilter, withKm } from "./rules";

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
    expect(parseFilters({ servizio: "  taglio   e barba ", data: "2026-11-14" }, today)).toEqual({ ...NO_FILTERS, service: "taglio e barba", date: "2026-11-14" });
    expect(parseFilters({ data: "2026-11-10" }, today)).toEqual(NO_FILTERS);
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

describe("filtri della ricerca (ridisegno del sito)", () => {
  const today = "2026-11-11";
  it("si leggono dall'indirizzo; valori sconosciuti non valgono", () => {
    expect(parseFilters({ oggi: "1", aperto: "1", nuovi: "1", fascia: "sera", km: "5", servizi: "bambini,barba,altro", ordina: "primo" }, today)).toEqual({
      ...NO_FILTERS,
      freeToday: true,
      openNow: true,
      isNew: true,
      band: "sera",
      maxKm: 5,
      services: ["barba", "bambini"], // sempre nell'ordine della barra
      sort: "first",
    });
    expect(parseFilters({ fascia: "notte", km: "7", servizi: "pizza", ordina: "prezzo", oggi: "0" }, today)).toEqual(NO_FILTERS);
    expect(parseFilters({}, today)).toEqual(NO_FILTERS);
  });

  it("«liberi oggi» non vale se si è scelto un altro giorno", () => {
    expect(parseFilters({ oggi: "1", data: "2026-11-14" }, today).freeToday).toBe(false);
    expect(parseFilters({ oggi: "1", data: today }, today).freeToday).toBe(true);
  });

  it("l'indirizzo con i filtri torna uguale a come si è letto (ricaricando la pagina restano)", () => {
    const f = { ...NO_FILTERS, freeToday: true, band: "sera" as const, maxKm: 10 as const, services: ["barba" as const], sort: "first" as const };
    const href = searchHref({ dove: "Bologna", ...f });
    expect(href).toBe("/cerca?dove=Bologna&oggi=1&fascia=sera&km=10&servizi=barba&ordina=primo");
    const q = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseFilters(q, today)).toEqual(f);
    expect(searchHref({ dove: "Bologna", ...NO_FILTERS })).toBe("/cerca?dove=Bologna");
  });

  it("«Cerca in questa zona»: un punto scelto dalla mappa, non la posizione di chi cerca", () => {
    expect(parseSearch({ lat: "44.5", lng: "11.3", zona: "1" })).toEqual({ kind: "point", lat: 44.5, lng: 11.3, zone: true });
    expect(searchHref({ lat: 44.5, lng: 11.3, zona: true, openNow: true })).toBe("/cerca?lat=44.5000&lng=11.3000&zona=1&aperto=1");
  });

  it("accendere e spegnere: la fascia è una sola, i servizi si sommano", () => {
    let f = toggleFilter(NO_FILTERS, "sera");
    expect(f.band).toBe("sera");
    f = toggleFilter(f, "mattina");
    expect(f.band).toBe("mattina");
    f = toggleFilter(f, "mattina");
    expect(f.band).toBeNull();
    f = toggleFilter(toggleFilter(f, "bambini"), "barba");
    expect(f.services).toEqual(["barba", "bambini"]);
    expect(isOn(f, "barba")).toBe(true);
    expect(toggleFilter(f, "barba").services).toEqual(["bambini"]);
    expect(withKm(NO_FILTERS, 5).maxKm).toBe(5);
    expect(withKm(withKm(NO_FILTERS, 5), 5).maxKm).toBeNull();
  });

  it("etichette dei filtri accesi, contatore e azzeramento (resta ciò che c'è nella barra)", () => {
    const f = { ...NO_FILTERS, service: "barba", date: "2026-11-14", freeToday: false, openNow: true, band: "sera" as const, maxKm: 5 as const, services: ["bambini" as const], sort: "first" as const };
    expect(activeTags(f).map((t) => t.label)).toEqual(["Aperto ora", "Sera", "Bambini", "Entro 5 km"]);
    expect(countFilters(f)).toBe(4);
    expect(activeTags(f)[0]!.off.openNow).toBe(false);
    expect(activeTags(f).at(-1)!.off.maxKm).toBeNull();
    expect(resetFilters(f)).toEqual({ ...NO_FILTERS, service: "barba", date: "2026-11-14", sort: "first" });
    expect(isNarrowed(NO_FILTERS)).toBe(false);
    expect(isNarrowed({ ...NO_FILTERS, service: "barba" })).toBe(false); // il servizio della barra non toglie l'allargamento
    expect(isNarrowed(f)).toBe(true);
  });
});

describe("etichette dell'elenco e della mappa", () => {
  const now = new Date("2026-11-14T15:00:00Z"); // sabato 14, le 16 a Roma
  it("distanza e orario della chiusura", () => {
    expect(kmLabel(0.8)).toBe("0,8 km");
    expect(kmLabel(2.44)).toBe("2,4 km");
    expect(kmLabel(18.4)).toBe("18 km");
    expect(clockLabel(1170)).toBe("19:30");
    expect(clockLabel(540)).toBe("09:00");
  });
  it("sulla mappa: l'ora se è oggi, il giorno e l'ora se è un altro giorno", () => {
    expect(pinLabel("2026-11-14T16:30:00Z", now)).toEqual({ text: "17:30", today: true });
    expect(pinLabel("2026-11-15T08:00:00Z", now)).toEqual({ text: "dom 09:00", today: false });
  });
});

describe("pageNumbers (paginatore)", () => {
  it("poche pagine: tutte", () => {
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3]);
  });
  it("tante pagine: prima, ultima e vicine alla corrente, con «…» (0) nei buchi", () => {
    expect(pageNumbers(1, 10)).toEqual([1, 2, 0, 10]);
    expect(pageNumbers(5, 10)).toEqual([1, 0, 4, 5, 6, 0, 10]);
    expect(pageNumbers(10, 10)).toEqual([1, 0, 9, 10]);
  });
  it("una pagina sola", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
  });
});
