/** Regole della ricerca dei saloni che non toccano il database: cosa si cerca e come si scrive il primo orario. */
import { addDays, isValidDate, romeDate, romeMinutes, weekdayShort, dayNumber, monthShort } from "@/lib/dates/rome";

export const RADIUS_KM = 30;
/** Se entro 30 km non c'è niente si allarga, per non lasciare la pagina vuota. */
export const WIDE_RADIUS_KM = 150;

export type SearchQuery = { kind: "none" } | { kind: "point"; lat: number; lng: number } | { kind: "text"; text: string };

/** Dai parametri dell'indirizzo: `?lat=&lng=` (Vicino a me) vince su `?dove=`. Coordinate fuori dall'Italia e dintorni non valgono. */
export function parseSearch(params: { dove?: string | string[]; lat?: string | string[]; lng?: string | string[] }): SearchQuery {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const lat = Number(one(params.lat));
  const lng = Number(one(params.lng));
  if (one(params.lat) !== "" && one(params.lng) !== "" && Number.isFinite(lat) && Number.isFinite(lng) && lat >= 35 && lat <= 48 && lng >= 6 && lng <= 19) {
    return { kind: "point", lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4 };
  }
  const text = one(params.dove).trim().slice(0, 80);
  return text ? { kind: "text", text } : { kind: "none" };
}

/** Servizio e giorno cercati (facoltativi): `?servizio=barba&data=2026-11-14`. */
export type SearchFilters = { service: string | null; date: string | null };
export const NO_FILTERS: SearchFilters = { service: null, date: null };
/** Fin dove si può scegliere il giorno (come l'anticipo massimo dei saloni). */
export const MAX_DAYS_AHEAD = 60;

export function parseFilters(params: { servizio?: string | string[]; data?: string | string[] }, today: string): SearchFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const service = one(params.servizio).replace(/\s+/g, " ").trim().slice(0, 40) || null;
  const d = one(params.data).trim();
  const date = isValidDate(d) && d >= today && d <= addDays(today, MAX_DAYS_AHEAD) ? d : null;
  return { service, date };
}

/** I parametri dell'indirizzo per una ricerca (si tolgono quelli vuoti). */
export function searchHref(p: { dove?: string | null; lat?: number; lng?: number; servizio?: string | null; data?: string | null }): string {
  const q = new URLSearchParams();
  if (p.servizio) q.set("servizio", p.servizio);
  if (p.lat !== undefined && p.lng !== undefined) {
    q.set("lat", p.lat.toFixed(4));
    q.set("lng", p.lng.toFixed(4));
  } else if (p.dove) q.set("dove", p.dove);
  if (p.data) q.set("data", p.data);
  const s = q.toString();
  return s ? `/cerca?${s}` : "/cerca";
}

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
