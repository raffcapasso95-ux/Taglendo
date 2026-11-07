/**
 * Orari del salone (scheda «Orari» di Listino e orari): ogni giorno ha le sue fasce, per esempio
 * 9:00–13:00 e 14:30–20:00. La pausa è lo spazio fra due fasce.
 * Regole dei design/ridisegno-2026-11 (listino-orari, listino-orari-giorno). Giorni come nel database: 0 = domenica … 6 = sabato.
 */
import { MAX_RANGES, rangesText, dayFromRanges, type Range, type WeekDay } from "./hours";

/** Di quanto si muove ogni freccia, in minuti. */
export const STEP = 15;
/** Una fascia dura almeno questo. */
const MIN_RANGE = 30;
/** Prima e dopo non si apre. */
const EARLIEST = 360; // 6:00
const LATEST = 1380; // 23:00

export type RangeField = "from" | "to";

/** Sposta l'inizio o la fine di una fascia di `delta` minuti, senza uscire dai limiti né toccare le fasce vicine. */
export function stepRange(ranges: Range[], index: number, field: RangeField, delta: number): Range[] {
  const cur = ranges[index];
  if (!cur) return ranges;
  const prevEnd = index > 0 ? ranges[index - 1]![1] : EARLIEST;
  const nextStart = index < ranges.length - 1 ? ranges[index + 1]![0] : LATEST;
  const [from, to] = cur;
  const next: Range =
    field === "from"
      ? [Math.max(prevEnd, Math.min(to - MIN_RANGE, from + delta)), to]
      : [from, Math.min(nextStart, Math.max(from + MIN_RANGE, to + delta))];
  return ranges.map((r, i) => (i === index ? next : r));
}

/** Aggiunge una fascia dopo l'ultima (15:00–19:00 se c'è posto, altrimenti quello che resta). Null se non ce n'è. */
export function addRange(ranges: Range[]): Range[] | null {
  if (ranges.length >= MAX_RANGES) return null;
  const lastEnd = ranges.length ? ranges[ranges.length - 1]![1] : 540;
  const start = Math.min(ranges.length ? lastEnd + 30 : 540, LATEST - MIN_RANGE);
  const end = Math.min(start + 240, LATEST);
  if (end - start < MIN_RANGE || (ranges.length && lastEnd >= LATEST - MIN_RANGE - 30)) return null;
  return [...ranges, [start, end]];
}

/** Toglie una fascia. */
export const removeRange = (ranges: Range[], index: number): Range[] => ranges.filter((_, i) => i !== index);

/** Tutta la settimana come la si salva: almeno un giorno resta aperto. */
export function canSaveWeek(week: WeekDay[]): boolean {
  return week.some((d) => !d.closed && d.ranges.length > 0);
}

/** Copia le fasce di un giorno sugli altri giorni scelti, aprendoli. */
export function copyDay(week: WeekDay[], from: number, to: number[]): WeekDay[] {
  const src = week[from]!;
  return week.map((d, i) => (to.includes(i) ? { closed: false, ranges: src.ranges.map((r): Range => [r[0], r[1]]) } : d));
}

const DAY_NAMES = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

/** «Aperto 5 giorni · 43 h a settimana» e «Oggi, venerdì: 9:00–13:00 · 14:30–19:00». */
export function weekSummary(week: WeekDay[], todayWeekday: number): { main: string; sub: string } {
  const days = week.map(dayFromRanges);
  const open = days.filter((d) => !d.closed);
  const minutes = open.reduce((sum, d) => sum + (d.closeMin! - d.openMin!) - d.breaks.reduce((s, [a, b]) => s + (b - a), 0), 0);
  const hours = Math.round(minutes / 60);
  const today = days[todayWeekday]!;
  return {
    main: `Aperto ${open.length} ${open.length === 1 ? "giorno" : "giorni"} · ${hours} h a settimana`,
    sub: `Oggi, ${DAY_NAMES[todayWeekday]}: ${today.closed ? "chiuso" : rangesText(today)}`,
  };
}

export type Slot = { weekday: number; startMin: number; endMin: number };

/** Quanti appuntamenti restano fuori dal nuovo orario (giorno chiuso, fuori dalle fasce, dentro una pausa). */
export function outsideHours(appts: Slot[], week: WeekDay[]): number {
  return appts.filter((a) => {
    const day = week[a.weekday];
    if (!day || day.closed || day.ranges.length === 0) return true;
    return !day.ranges.some(([from, to]) => a.startMin >= from && a.endMin <= to);
  }).length;
}

const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // da lunedì a domenica
const SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

/** I giorni, da lunedì a domenica, nell'ordine della settimana italiana. */
export const WEEK_ORDER = DAYS_ORDER;
export const DAY_SHORT = SHORT;
export const dayTitle = (weekday: number) => DAY_NAMES[weekday]!.charAt(0).toUpperCase() + DAY_NAMES[weekday]!.slice(1);

