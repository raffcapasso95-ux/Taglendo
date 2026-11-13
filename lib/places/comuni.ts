/**
 * I comuni italiani con le coordinate (GeoNames, CC BY 4.0: vedi docs/ricerca-saloni.md).
 * Servono alla ricerca dei saloni: «dove» è un comune, e un indirizzo senza coordinate precise prende quelle del suo comune.
 */
import data from "./comuni.json";

export type Comune = { name: string; prov: string; lat: number; lng: number; pop: number };

/** Dal più popoloso: a parità di nome o di inizio, vince la città più grande. */
const COMUNI: Comune[] = (data as Array<[string, string, number, number, number]>).map(([name, prov, lat, lng, pop]) => ({ name, prov, lat, lng, pop }));

/** minuscole, senza accenti, apostrofi e trattini come spazi: «Reggio nell'Emilia» → «reggio nell emilia». */
export const normalizePlace = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`\-/.]/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Come la gente chiama alcune città. */
const ALIASES: Record<string, string> = {
  "reggio emilia": "reggio nell emilia",
  "reggio calabria": "reggio di calabria",
  "forli": "forli",
  "monza": "monza",
  "san remo": "sanremo",
};

const KEYED = COMUNI.map((c) => ({ c, key: normalizePlace(c.name) }));
const BY_KEY = new Map<string, Comune>();
for (const { c, key } of KEYED) if (!BY_KEY.has(key)) BY_KEY.set(key, c); // il primo è il più popoloso

/** Il comune con questo nome (scritto come capita), o null. */
export function findComune(query: string): Comune | null {
  const key = normalizePlace(query);
  if (!key) return null;
  return BY_KEY.get(ALIASES[key] ?? key) ?? null;
}

/** Suggerimenti mentre si scrive: prima i comuni che iniziano così, poi quelli con una parola che inizia così. */
export function suggestComuni(query: string, limit = 6): Comune[] {
  const key = ALIASES[normalizePlace(query)] ?? normalizePlace(query);
  if (key.length < 2) return [];
  const starts: Comune[] = [];
  const words: Comune[] = [];
  for (const { c, key: k } of KEYED) {
    if (k.startsWith(key)) starts.push(c);
    else if (words.length < limit && k.includes(` ${key}`)) words.push(c);
    if (starts.length >= limit) break;
  }
  return [...starts, ...words].slice(0, limit);
}

/** «reggio-nell-emilia»: il comune nell'indirizzo della pagina per città. */
export const citySlug = (name: string) => normalizePlace(name).replace(/ /g, "-");
export const comuneBySlug = (slug: string): Comune | null => BY_KEY.get(normalizePlace(slug)) ?? null;

/**
 * Il comune dentro un indirizzo scritto a mano («Via Saragozza 41, 40123 Bologna BO»).
 * Si guarda dalla fine, pezzo per pezzo (tolti CAP, provincia e «Italia»); se non basta, il nome più lungo che compare nel testo.
 */
export function comuneInAddress(address: string): Comune | null {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const cleaned = parts[i]!
      .replace(/\b\d{5}\b/g, " ")
      .replace(/\(([A-Za-z]{2})\)/g, " ")
      .replace(/\bItalia\b/i, " ")
      .trim();
    if (!cleaned || /^\d+[a-z]?$/i.test(cleaned)) continue;
    const whole = findComune(cleaned);
    if (whole) return whole;
    // «Bologna BO»: senza la sigla della provincia in coda
    const noProv = cleaned.replace(/\s+[A-Z]{2}$/, "").trim();
    const hit = noProv !== cleaned ? findComune(noProv) : null;
    if (hit) return hit;
    if (i === 0) break; // il primo pezzo è la via: «Via Roma» non è Roma
  }
  // ultima prova: nel testo dopo la via, il comune dal nome più lungo
  const tail = ` ${normalizePlace(parts.slice(1).join(" "))} `;
  let best: { c: Comune; len: number } | null = null;
  if (tail.trim()) {
    for (const { c, key } of KEYED) {
      if (key.length >= 3 && tail.includes(` ${key} `) && (!best || key.length > best.len)) best = { c, len: key.length };
    }
  }
  return best?.c ?? null;
}

/** Distanza in km tra due punti (formula dell'emisenoverso). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Il comune più vicino a un punto: dà un nome a «Vicino a me». */
export function nearestComune(lat: number, lng: number): Comune | null {
  let best: Comune | null = null;
  let d = Infinity;
  for (const c of COMUNI) {
    if (Math.abs(c.lat - lat) > 0.5 || Math.abs(c.lng - lng) > 0.7) continue;
    const k = distanceKm({ lat, lng }, c);
    if (k < d) {
      d = k;
      best = c;
    }
  }
  return best;
}

/** «a 600 m», «a 2,4 km», «a 18 km». */
export function distanceLabel(km: number): string {
  if (km < 1) return `a ${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `a ${km.toFixed(1).replace(".", ",")} km`;
  return `a ${Math.round(km)} km`;
}
