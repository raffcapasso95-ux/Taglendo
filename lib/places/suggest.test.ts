import { describe, expect, it } from "vitest";
import { parseSuggestions, placesRequest } from "./suggest";

describe("suggerimenti di indirizzo", () => {
  it("prende via, città e testo completo dalla risposta di Google, senza «Italia» in coda", () => {
    const body = {
      suggestions: [
        {
          placePrediction: {
            placeId: "abc",
            text: { text: "Via Filippo Palizzi, 47, Napoli, NA, Italia" },
            structuredFormat: { mainText: { text: "Via Filippo Palizzi, 47" }, secondaryText: { text: "Napoli, NA, Italia" } },
          },
        },
        { queryPrediction: { text: { text: "barbiere" } } },
      ],
    };
    expect(parseSuggestions(body)).toEqual([{ id: "abc", text: "Via Filippo Palizzi, 47, Napoli, NA", main: "Via Filippo Palizzi, 47", secondary: "Napoli, NA" }]);
  });

  it("risposta vuota o strana: nessun suggerimento", () => {
    expect(parseSuggestions(null)).toEqual([]);
    expect(parseSuggestions({ error: "x" })).toEqual([]);
  });

  it("cerca solo in Italia, in italiano", () => {
    expect(placesRequest("via roma", "t1").body).toEqual({ input: "via roma", languageCode: "it", includedRegionCodes: ["it"], sessionToken: "t1" });
  });
});
