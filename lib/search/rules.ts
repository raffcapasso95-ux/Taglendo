/** Regole della ricerca dei saloni che non toccano il database: cosa si cerca e come si scrive il primo orario. */
import { addDays, isValidDate, romeDate, romeMinutes, weekdayShort, dayNumber, monthShort } from "@/lib/dates/rome";

export const RADIUS_KM = 30;
/** Se entro 30 km non c'è niente si allarga, per non lasciare la pagina vuota. */
export const WIDE_RADIUS_KM = 150;

/** `point`: un punto sulla mappa. `zone` = scelto spostando la mappa («Cerca in questa zona»), non la posizione di chi cerca. */
export type SearchQuery = { kind: "none" } | { kind: "point"; lat: number; lng: number; zone?: boolean } | { kind: "text"; text: string };

/** Dai parametri dell'indirizzo: `?lat=&lng=` (Vicino a me) vince su `?dove=`. Coordinate fuori dall'Italia e dintorni non valgono. */
export function parseSearch(params: { dove?: string | string[]; lat?: string | string[]; lng?: string | string[]; zona?: string | string[] }): SearchQuery {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const lat = Number(one(params.lat));
  const lng = Number(one(params.lng));
  if (one(params.lat) !== "" && one(params.lng) !== "" && Number.isFinite(lat) && Number.isFinite(lng) && lat >= 35 && lat <= 48 && lng >= 6 && lng <= 19) {
    return { kind: "point", lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4, ...(one(params.zona) === "1" ? { zone: true } : {}) };
  }
  const text = one(params.dove).trim().slice(0, 80);
  return text ? { kind: "text", text } : { kind: "none" };
}

export const BANDS = ["mattina", "pomeriggio", "sera"] as const;
export type Band = (typeof BANDS)[number];
/** I servizi della barra filtri; nel database si cercano per un pezzo del nome («bambin» trova «Taglio bambino»). */
export const SERVICE_KEYS = ["barba", "sfumatura", "rasatura", "bambini"] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];
export const SERVICE_TERM: Record<ServiceKey, string> = { barba: "barba", sfumatura: "sfumatur", rasatura: "rasatur", bambini: "bambin" };
export const KMS = [2, 5, 10, 20] as const;
export type Km = (typeof KMS)[number];
export type Sort = "km" | "first";

/**
 * Cosa si cerca oltre al luogo. Nell'indirizzo: `?servizio=barba&data=2026-11-14` (dalla barra) e i filtri
 * `&oggi=1&aperto=1&nuovi=1&fascia=sera&km=5&servizi=barba,bambini&ordina=primo`.
 */
export type SearchFilters = {
  service: string | null;
  date: string | null;
  freeToday: boolean;
  openNow: boolean;
  isNew: boolean;
  band: Band | null;
  maxKm: Km | null;
  services: ServiceKey[];
  sort: Sort;
};
export const NO_FILTERS: SearchFilters = { service: null, date: null, freeToday: false, openNow: false, isNew: false, band: null, maxKm: null, services: [], sort: "km" };
/** Fin dove si può scegliere il giorno (come l'anticipo massimo dei saloni). */
export const MAX_DAYS_AHEAD = 60;

type Raw = string | string[] | undefined;
type FilterParams = { servizio?: Raw; data?: Raw; oggi?: Raw; aperto?: Raw; nuovi?: Raw; fascia?: Raw; km?: Raw; servizi?: Raw; ordina?: Raw };

export function parseFilters(params: FilterParams, today: string): SearchFilters {
  const one = (v: Raw) => (Array.isArray(v) ? v[0] : v) ?? "";
  const service = one(params.servizio).replace(/\s+/g, " ").trim().slice(0, 40) || null;
  const d = one(params.data).trim();
  const date = isValidDate(d) && d >= today && d <= addDays(today, MAX_DAYS_AHEAD) ? d : null;
  const band = BANDS.find((b) => b === one(params.fascia)) ?? null;
  const km = KMS.find((k) => String(k) === one(params.km)) ?? null;
  const asked = one(params.servizi).split(",");
  return {
    service,
    date,
    // «liberi oggi» non ha senso con un altro giorno scelto
    freeToday: one(params.oggi) === "1" && (date === null || date === today),
    openNow: one(params.aperto) === "1",
    isNew: one(params.nuovi) === "1",
    band,
    maxKm: km,
    services: SERVICE_KEYS.filter((k) => asked.includes(k)),
    sort: one(params.ordina) === "primo" ? "first" : "km",
  };
}

type HrefInput = { dove?: string | null; lat?: number; lng?: number; zona?: boolean; servizio?: string | null; data?: string | null } & Partial<Omit<SearchFilters, "service" | "date">>;

/** I parametri dell'indirizzo per una ricerca (si tolgono quelli vuoti). */
export function searchHref(p: HrefInput): string {
  const q = new URLSearchParams();
  if (p.servizio) q.set("servizio", p.servizio);
  if (p.lat !== undefined && p.lng !== undefined) {
    q.set("lat", p.lat.toFixed(4));
    q.set("lng", p.lng.toFixed(4));
    if (p.zona) q.set("zona", "1");
  } else if (p.dove) q.set("dove", p.dove);
  if (p.data) q.set("data", p.data);
  if (p.freeToday) q.set("oggi", "1");
  if (p.openNow) q.set("aperto", "1");
  if (p.isNew) q.set("nuovi", "1");
  if (p.band) q.set("fascia", p.band);
  if (p.maxKm) q.set("km", String(p.maxKm));
  if (p.services?.length) q.set("servizi", p.services.join(","));
  if (p.sort === "first") q.set("ordina", "primo");
  const s = q.toString();
  return s ? `/cerca?${s}` : "/cerca";
}

/** Un filtro della barra: la chiave serve a accenderlo e spegnerlo. */
export type FilterKey = "oggi" | "aperto" | "nuovi" | Band | ServiceKey;
export const FILTER_LABEL: Record<FilterKey, string> = {
  oggi: "Liberi oggi",
  aperto: "Aperto ora",
  nuovi: "Nuovi su Taglendo",
  mattina: "Mattina",
  pomeriggio: "Pomeriggio",
  sera: "Sera",
  barba: "Barba",
  sfumatura: "Sfumatura",
  rasatura: "Rasatura",
  bambini: "Bambini",
};
/** I filtri rapidi sotto la ricerca, nell'ordine del design. */
export const QUICK_FILTERS: FilterKey[] = ["oggi", "aperto", "sera", "barba", "bambini", "nuovi"];

export function isOn(f: SearchFilters, k: FilterKey): boolean {
  if (k === "oggi") return f.freeToday;
  if (k === "aperto") return f.openNow;
  if (k === "nuovi") return f.isNew;
  if ((BANDS as readonly string[]).includes(k)) return f.band === k;
  return f.services.includes(k as ServiceKey);
}

/** Accende o spegne un filtro. La fascia oraria è una sola: sceglierne un'altra sostituisce la prima. */
export function toggleFilter(f: SearchFilters, k: FilterKey): SearchFilters {
  const on = isOn(f, k);
  if (k === "oggi") return { ...f, freeToday: !on };
  if (k === "aperto") return { ...f, openNow: !on };
  if (k === "nuovi") return { ...f, isNew: !on };
  if ((BANDS as readonly string[]).includes(k)) return { ...f, band: on ? null : (k as Band) };
  const key = k as ServiceKey;
  return { ...f, services: on ? f.services.filter((x) => x !== key) : SERVICE_KEYS.filter((x) => x === key || f.services.includes(x)) };
}

/** Gli stessi filtri, con la distanza massima scelta (toccando quella già scelta si toglie). */
export const withKm = (f: SearchFilters, km: Km): SearchFilters => ({ ...f, maxKm: f.maxKm === km ? null : km });

/** Tutto azzerato, tranne ciò che si è scritto nella barra (servizio, giorno) e l'ordine. */
export const resetFilters = (f: SearchFilters): SearchFilters => ({ ...NO_FILTERS, service: f.service, date: f.date, sort: f.sort });

/** I filtri accesi, come etichette che si possono togliere. */
export function activeTags(f: SearchFilters): Array<{ id: string; label: string; off: SearchFilters }> {
  const tags: Array<{ id: string; label: string; off: SearchFilters }> = [];
  for (const k of ["oggi", "aperto", "nuovi", ...BANDS, ...SERVICE_KEYS] as FilterKey[]) {
    if (isOn(f, k)) tags.push({ id: k, label: FILTER_LABEL[k], off: toggleFilter(f, k) });
  }
  if (f.maxKm) tags.push({ id: "km", label: `Entro ${f.maxKm} km`, off: { ...f, maxKm: null } });
  return tags;
}

/** Quanti filtri sono accesi (per il pallino sul pulsante «Filtri»). */
export const countFilters = (f: SearchFilters) => activeTags(f).length;

/** Con questi filtri non ha senso allargare la ricerca ai saloni più lontani. */
export const isNarrowed = (f: SearchFilters) => countFilters(f) > 0;

const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** «oggi alle 15:30», «domani alle 10:00», «Ven 13 nov, 10:00». */
export function slotLabel(startsAt: string, now: Date): string {
  const at = new Date(startsAt);
  const day = romeDate(at);
  const today = romeDate(now);
  const time = clock(romeMinutes(at));
  if (day === today) return `oggi alle ${time}`;
  if (day === addDays(today, 1)) return `domani alle ${time}`;
  const w = weekdayShort(day);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} ${dayNumber(day)} ${monthShort(day)}, ${time}`;
}

/** Il giorno di un orario, come si dice: «Oggi», «Domani», «Ven 13 nov». */
export function dayLabel(startsAt: string, now: Date): string {
  const day = romeDate(new Date(startsAt));
  const today = romeDate(now);
  if (day === today) return "Oggi";
  if (day === addDays(today, 1)) return "Domani";
  const w = weekdayShort(day);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} ${dayNumber(day)} ${monthShort(day)}`;
}

/** I prossimi orari come pulsanti: il giorno del primo in testa, e il giorno sul pulsante solo quando cambia. */
export function slotChips(slots: readonly string[], now: Date): { day: string | null; chips: Array<{ time: string; day: string | null }> } {
  if (slots.length === 0) return { day: null, chips: [] };
  const first = dayLabel(slots[0]!, now);
  return {
    day: first,
    chips: slots.map((s) => {
      const d = dayLabel(s, now);
      return { time: clock(romeMinutes(new Date(s))), day: d === first ? null : d };
    }),
  };
}

/** «oggi», «domani», «sabato 14 novembre»: il giorno cercato, dentro una frase. */
export function dayPhrase(date: string, today: string): string {
  if (date === today) return "oggi";
  if (date === addDays(today, 1)) return "domani";
  const WEEK = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return `${WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

/** Il titolo dei risultati: «Barbieri a Bologna», «Barba a Bologna», «… · sabato 14 novembre». */
export function resultsTitle(p: { place: string | null; near: boolean; service: string | null; date: string | null; today: string }): string {
  const what = p.service ? p.service.charAt(0).toUpperCase() + p.service.slice(1) : "Barbieri";
  const where = p.near ? (p.place ? `vicino a te · ${p.place}` : "vicino a te") : p.place ? `a ${p.place}` : "";
  const when = p.date ? ` · ${dayPhrase(p.date, p.today)}` : "";
  return `${what} ${where}`.trim() + when;
}

/** «0,8 km», «2,4 km», «18 km»: la distanza come nelle schede. */
export function kmLabel(km: number): string {
  return km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;
}

/** L'etichetta del primo orario libero sulla mappa: «17:30» se è oggi, «dom 09:00» se è un altro giorno. */
export function pinLabel(startsAt: string, now: Date): { text: string; today: boolean } {
  const at = new Date(startsAt);
  const day = romeDate(at);
  const min = romeMinutes(at);
  const time = clockLabel(min);
  if (day === romeDate(now)) return { text: time, today: true };
  return { text: `${weekdayShort(day).toLowerCase()} ${time}`, today: false };
}

/** «19:30» da minuti dalla mezzanotte. */
export const clockLabel = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Il numero delle pagine da mostrare: la prima, l'ultima e quelle vicine alla corrente (0 = «…»). */
export function pageNumbers(page: number, total: number): number[] {
  const keep = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total));
  const out: number[] = [];
  let last = 0;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (last && n - last > 1) out.push(0);
    out.push(n);
    last = n;
  }
  return out;
}
