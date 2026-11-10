/**
 * Festività italiane: quali sono, in che giorno cadono e quali chiusure servono al salone.
 * Il titolare spunta quelle in cui è chiuso; le chiusure si creano da sole, ogni anno.
 */

export type HolidayKey =
  | "capodanno"
  | "epifania"
  | "pasqua"
  | "pasquetta"
  | "liberazione"
  | "lavoro"
  | "repubblica"
  | "ferragosto"
  | "san_francesco"
  | "ognissanti"
  | "immacolata"
  | "natale"
  | "santo_stefano"
  | "patrono";

type Fixed = { key: HolidayKey; name: string; day: string }; // day = "MM-GG"
type Moving = { key: HolidayKey; name: string; fromEaster: number };

/** Le feste nazionali, nell'ordine dell'anno. San Francesco (4 ottobre) è di nuovo festa nazionale dal 2026. */
export const NATIONAL_HOLIDAYS: Array<Fixed | Moving> = [
  { key: "capodanno", name: "Capodanno", day: "01-01" },
  { key: "epifania", name: "Epifania", day: "01-06" },
  { key: "pasqua", name: "Pasqua", fromEaster: 0 },
  { key: "pasquetta", name: "Pasquetta", fromEaster: 1 },
  { key: "liberazione", name: "Festa della Liberazione", day: "04-25" },
  { key: "lavoro", name: "Festa del Lavoro", day: "05-01" },
  { key: "repubblica", name: "Festa della Repubblica", day: "06-02" },
  { key: "ferragosto", name: "Ferragosto", day: "08-15" },
  { key: "san_francesco", name: "San Francesco d’Assisi", day: "10-04" },
  { key: "ognissanti", name: "Ognissanti", day: "11-01" },
  { key: "immacolata", name: "Immacolata", day: "12-08" },
  { key: "natale", name: "Natale", day: "12-25" },
  { key: "santo_stefano", name: "Santo Stefano", day: "12-26" },
];

export const PATRON_DEFAULT_NAME = "Santo patrono";
const KEYS = new Set<string>([...NATIONAL_HOLIDAYS.map((h) => h.key), "patrono"]);
export const isHolidayKey = (k: string): k is HolidayKey => KEYS.has(k);

export type Patron = { day: string; name: string | null } | null;
export type HolidayDay = { key: HolidayKey; name: string; date: string };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** La domenica di Pasqua (calendario gregoriano, algoritmo di Meeus/Jones/Butcher). */
export function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** «MM-GG» valido (il 29 febbraio vale: negli anni non bisestili la festa salta). */
export const isPatronDay = (s: string) => /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(s);

/** Il giorno di una festa in un anno; null se in quell'anno non esiste (es. 29 febbraio, 31 aprile). */
export function holidayDate(key: HolidayKey, year: number, patron: Patron = null): string | null {
  const fixed = (day: string) => {
    const [m, d] = day.split("-").map(Number) as [number, number];
    const date = new Date(Date.UTC(year, m - 1, d));
    return date.getUTCMonth() === m - 1 ? iso(date) : null;
  };
  if (key === "patrono") return patron && isPatronDay(patron.day) ? fixed(patron.day) : null;
  const h = NATIONAL_HOLIDAYS.find((x) => x.key === key)!;
  if ("day" in h) return fixed(h.day);
  const e = easter(year);
  const date = new Date(Date.UTC(year, Number(e.slice(5, 7)) - 1, Number(e.slice(8, 10)) + h.fromEaster));
  return iso(date);
}

export const holidayName = (key: HolidayKey, patron: Patron = null) =>
  key === "patrono" ? patron?.name?.trim() || PATRON_DEFAULT_NAME : NATIONAL_HOLIDAYS.find((h) => h.key === key)!.name;

/** Tutte le feste (nazionali e, se c'è, il patrono) con il prossimo giorno in cui cadono da oggi, la più vicina prima. */
export function upcomingHolidays(today: string, patron: Patron = null): HolidayDay[] {
  const year = Number(today.slice(0, 4));
  const keys: HolidayKey[] = [...NATIONAL_HOLIDAYS.map((h) => h.key), ...(patron ? (["patrono"] as const) : [])];
  const out: HolidayDay[] = [];
  for (const key of keys) {
    for (let y = year; y <= year + 4; y++) {
      const date = holidayDate(key, y, patron);
      if (date && date >= today) {
        out.push({ key, name: holidayName(key, patron), date });
        break;
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

/** Fin dove si preparano le chiusure: la fine dell'anno prossimo (copre ogni anticipo di prenotazione). */
export const holidayHorizon = (today: string) => `${Number(today.slice(0, 4)) + 1}-12-31`;

/** Ogni giorno di chiusura che serve, da oggi all'orizzonte, per le feste scelte. */
export function wantedHolidayClosures(keys: readonly string[], patron: Patron, today: string): HolidayDay[] {
  const until = holidayHorizon(today);
  const year = Number(today.slice(0, 4));
  const out: HolidayDay[] = [];
  for (const key of new Set(keys)) {
    if (!isHolidayKey(key)) continue;
    for (let y = year; y <= year + 1; y++) {
      const date = holidayDate(key, y, patron);
      if (date && date >= today && date <= until) out.push({ key, name: holidayName(key, patron), date });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export type HolidayClosure = { id: string; holiday: string; startsOn: string; note: string | null };

/**
 * Cosa cambiare nelle chiusure delle feste (solo da oggi in poi): togliere quelle non più scelte o spostate,
 * aggiungere quelle mancanti, rinominare quelle col nome cambiato (il patrono).
 */
export function holidayPlan(existing: readonly HolidayClosure[], wanted: readonly HolidayDay[], today: string) {
  const id = (key: string, date: string) => `${key}|${date}`;
  const want = new Map(wanted.map((w) => [id(w.key, w.date), w]));
  const have = new Map(existing.filter((e) => e.startsOn >= today).map((e) => [id(e.holiday, e.startsOn), e]));
  const remove = [...have.entries()].filter(([k]) => !want.has(k)).map(([, e]) => e.id);
  const add = [...want.entries()].filter(([k]) => !have.has(k)).map(([, w]) => w);
  const rename = [...want.entries()]
    .filter(([k, w]) => have.has(k) && have.get(k)!.note !== w.name)
    .map(([k, w]) => ({ id: have.get(k)!.id, note: w.name }));
  return { remove, add, rename };
}
