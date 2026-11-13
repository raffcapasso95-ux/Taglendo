import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { geocodeAddress, parseGeocode } from "./geocode";

describe("posizione di un indirizzo", () => {
  it("dalla risposta di Google prende il punto e il comune", () => {
    const body = {
      status: "OK",
      results: [
        {
          geometry: { location: { lat: 44.4912, lng: 11.3271 } },
          address_components: [
            { long_name: "41", types: ["street_number"] },
            { long_name: "Bologna", types: ["locality", "political"] },
          ],
        },
      ],
    };
    expect(parseGeocode(body)).toEqual({ lat: 44.4912, lng: 11.3271, city: "Bologna", precise: true });
    expect(parseGeocode({ status: "ZERO_RESULTS", results: [] })).toBeNull();
    expect(parseGeocode(null)).toBeNull();
  });

  it("senza chiave usa il centro del comune scritto nell'indirizzo", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const pos = await geocodeAddress("Via Saragozza 41, 40123 Bologna BO");
    expect(pos).toMatchObject({ city: "Bologna", precise: false });
    expect(pos!.lat).toBeCloseTo(44.49, 1);
    expect(await geocodeAddress("Via Roma 12")).toBeNull();
    vi.unstubAllEnvs();
  });
});
