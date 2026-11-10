/**
 * Date e orari nel fuso di Roma, senza librerie.
 * Il database tiene gli istanti in UTC; qui si passa dal "giorno di Roma" (2026-11-05)
 * agli istanti e viceversa, comprese le giornate del cambio d'ora (23 o 25 ore).
 */
import { TIME_ZONE } from "./format";

const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type Wall = { year: number; month: number; day: number; hour: number; minute: number };

function wallOf(date: Date): Wall {
  const p = Object.fromEntries(parts.formatToParts(date).map((x) => [x.type, x.value]));
  return { year: +p.year!, month: +p.month!, day: +p.day!, hour: +p.hour!, minute: +p.minute! };
}

/** Anticipo di Roma rispetto a UTC in quell'istante, in minuti (60 d'inverno, 120 d'estate). */
export function romeOffsetMinutes(at: Date): number {
  const w = wallOf(at);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Il giorno di Roma di un istante, "2026-11-05". */
export function romeDate(at: Date): string {
  const w = wallOf(at);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/** Minuti dalla mezzanotte di Roma, per un istante. */
export function romeMinutes(at: Date): number {
  const w = wallOf(at);
  return w.hour * 60 + w.minute;
}

/** L'istante in cui, a Roma, sono le `minutes` del giorno `date`. Per orari che esistono (non 02:30 dell'ora legale). */
export function romeWallToUtc(date: string, minutes = 0): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const wallMs = Date.UTC(y, m - 1, d, 0, minutes);
  let t = wallMs;
  for (let i = 0; i < 3; i++) t = wallMs - romeOffsetMinutes(new Date(t)) * 60000;
  return new Date(t);
}

/** Somma giorni a una data "2026-11-05". */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = domenica … 6 = sabato. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Inizio del giorno e inizio del giorno dopo, come istanti UTC. */
export function dayRange(date: string): { start: Date; end: Date } {
  return { start: romeWallToUtc(date, 0), end: romeWallToUtc(addDays(date, 1), 0) };
}

export function isValidDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return addDays(value, 0) === value;
}

const long = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** `Giovedì 29 ottobre` */
export function longDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return cap(long.format(new Date(Date.UTC(y, m - 1, d))));
}

const MONTHS_LONG = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

/** `Novembre 2026` */
export const monthYear = (date: string) => `${MONTHS_LONG[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

const WEEKDAYS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MONTHS_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export const weekdayName = (date: string) => WEEKDAYS[weekdayOf(date)]!;
export const weekdayShort = (date: string) => WEEKDAYS[weekdayOf(date)]!.slice(0, 3);
export const dayNumber = (date: string) => Number(date.slice(8, 10));
export const monthShort = (date: string) => MONTHS_SHORT[Number(date.slice(5, 7)) - 1]!;
