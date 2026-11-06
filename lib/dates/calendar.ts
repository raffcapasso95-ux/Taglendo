/** Calendario mensile: mesi, griglia lunedì-domenica ed etichette in italiano. Date come «2026-11-05», mesi come «2026-11». */
import { addDays, weekdayOf } from "./rome";

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MONTHS_CHIP = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const isMonthKey = (value: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export const monthOf = (date: string): string => date.slice(0, 7);
const parts = (key: string) => key.split("-").map(Number) as [number, number];

/** Somma (o toglie) mesi a «2026-11». */
export function addMonths(key: string, n: number): string {
  const [y, m] = parts(key);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** `Marzo 2027` */
export function monthTitle(key: string): string {
  const [y, m] = parts(key);
  return `${cap(MONTHS[m - 1]!)} ${y}`;
}

/** Etichetta della scorciatoia: `Nov`, e `Gen 27` per gennaio, così si capisce che l'anno è cambiato. */
export function monthChip(key: string): string {
  const [y, m] = parts(key);
  return m === 1 ? `${MONTHS_CHIP[0]} ${String(y).slice(2)}` : MONTHS_CHIP[m - 1]!;
}

/** I mesi per le scorciatoie, dal mese di `from` in poi. */
export const monthRange = (from: string, count: number): string[] => Array.from({ length: count }, (_, i) => addMonths(from, i));

/** Primo giorno, giorni del mese e quanti riquadri vuoti ci vogliono prima (la settimana parte da lunedì). */
export function monthGrid(key: string): { lead: number; days: string[] } {
  const first = `${key}-01`;
  const days: string[] = [];
  for (let d = first; monthOf(d) === key; d = addDays(d, 1)) days.push(d);
  return { lead: (weekdayOf(first) + 6) % 7, days };
}

const dayNum = (date: string) => Number(date.slice(8, 10));

/** `Martedì 16 marzo 2027` (nome accessibile di un giorno del calendario). */
export function dayLabel(date: string): string {
  const [y, m] = parts(monthOf(date));
  return `${cap(WEEKDAYS[weekdayOf(date)]!)} ${dayNum(date)} ${MONTHS[m - 1]} ${y}`;
}

/** `martedì 16 marzo` (nel pulsante «Apri martedì 16 marzo»). */
export function dayLabelShort(date: string): string {
  const [, m] = parts(monthOf(date));
  return `${WEEKDAYS[weekdayOf(date)]} ${dayNum(date)} ${MONTHS[m - 1]}`;
}

/** Primo e ultimo giorno di un mese. */
export function monthBounds(key: string): { first: string; last: string } {
  const days = monthGrid(key).days;
  return { first: days[0]!, last: days[days.length - 1]! };
}
