/** Regole della ricerca dei saloni che non toccano il database: cosa si cerca e come si scrive il primo orario. */
import { addDays, romeDate, romeMinutes, weekdayShort, dayNumber, monthShort } from "@/lib/dates/rome";

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
