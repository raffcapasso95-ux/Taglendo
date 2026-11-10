/** Suggerimenti di indirizzo da Google Places (Autocomplete, API «New»). Solo lato server: la chiave non va nel browser. */

export type AddressSuggestion = { id: string; text: string; main: string; secondary: string };

type PlacesResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
    };
  }>;
};

/** Ricava i suggerimenti dalla risposta di Google: indirizzo completo, via e numero, città. Al massimo 5. */
export function parseSuggestions(body: unknown): AddressSuggestion[] {
  const list = (body as PlacesResponse | null)?.suggestions ?? [];
  const out: AddressSuggestion[] = [];
  for (const s of list) {
    const p = s.placePrediction;
    const text = p?.text?.text?.trim();
    if (!p?.placeId || !text) continue;
    out.push({
      id: p.placeId,
      text: text.replace(/, Italia$/, ""),
      main: p.structuredFormat?.mainText?.text?.trim() || text,
      secondary: (p.structuredFormat?.secondaryText?.text?.trim() ?? "").replace(/, Italia$/, ""),
    });
    if (out.length === 5) break;
  }
  return out;
}

/** La richiesta a Google: indirizzi in Italia, in italiano. */
export function placesRequest(input: string, sessionToken?: string) {
  return {
    url: "https://places.googleapis.com/v1/places:autocomplete",
    body: {
      input,
      languageCode: "it",
      includedRegionCodes: ["it"],
      ...(sessionToken ? { sessionToken } : {}),
    },
  };
}
