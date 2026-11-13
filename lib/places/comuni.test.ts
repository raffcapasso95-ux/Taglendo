import { describe, expect, it } from "vitest";
import { citySlug, comuneBySlug, comuneInAddress, distanceKm, distanceLabel, findComune, nearestComune, suggestComuni } from "./comuni";

describe("comuni: cercare un salone parte da una città", () => {
  it("trova il comune comunque sia scritto, e a parità di nome la città più grande", () => {
    expect(findComune("bologna")).toMatchObject({ name: "Bologna", prov: "BO" });
    expect(findComune("  REGGIO EMILIA ")).toMatchObject({ prov: "RE" });
    expect(findComune("Forlì")).toMatchObject({ prov: "FC" });
    expect(findComune("L'Aquila")).toMatchObject({ prov: "AQ" });
    expect(findComune("via roma")).toBeNull();
  });

  it("suggerisce mentre si scrive: prima le città grandi", () => {
    expect(suggestComuni("bol").map((c) => c.name)[0]).toBe("Bologna");
    expect(suggestComuni("nap")[0]).toMatchObject({ name: "Napoli" });
    expect(suggestComuni("b")).toEqual([]);
    expect(suggestComuni("san ", 4)).toHaveLength(4);
  });

  it("il comune dentro un indirizzo scritto a mano", () => {
    expect(comuneInAddress("Via Saragozza 41, 40123 Bologna BO")?.name).toBe("Bologna");
    expect(comuneInAddress("Via Filippo Palizzi, 47, Napoli, NA")?.name).toBe("Napoli");
    expect(comuneInAddress("Via Roma 12, Casalecchio di Reno (BO)")?.name).toBe("Casalecchio di Reno");
    expect(comuneInAddress("Corso Italia 3, 80067 Sorrento")?.name).toBe("Sorrento");
    expect(comuneInAddress("Via Roma 12")).toBeNull(); // la via non è la città
    expect(comuneInAddress("Piazza Maggiore 1 - Bologna")).toBeNull(); // senza virgola non si indovina: meglio niente che sbagliato
  });

  it("la pagina per città: indirizzo e ritorno", () => {
    expect(citySlug("Reggio nell'Emilia")).toBe("reggio-nell-emilia");
    expect(comuneBySlug("reggio-nell-emilia")?.prov).toBe("RE");
    expect(comuneBySlug("non-esiste")).toBeNull();
  });

  it("distanze e «vicino a me»", () => {
    const bo = findComune("Bologna")!;
    const mo = findComune("Modena")!;
    expect(distanceKm(bo, mo)).toBeGreaterThan(30);
    expect(distanceKm(bo, mo)).toBeLessThan(45);
    expect(nearestComune(44.4949, 11.3426)?.name).toBe("Bologna");
    expect(distanceLabel(0.62)).toBe("a 600 m");
    expect(distanceLabel(2.44)).toBe("a 2,4 km");
    expect(distanceLabel(18.3)).toBe("a 18 km");
  });
});
