/**
 * Orari del salone (scheda Listino e orari): un orario uguale per tutti i giorni aperti,
 * con pausa facoltativa. Regole e limiti da design/Taglendo App.dc.html (hStep, hToggleDay, hPause, hSave).
 * Giorni come nel database: 0 = domenica … 6 = sabato.
 */
import { formatMinutes } from "./hours";

export type HoursDraft = {
  /** Giorni chiusi (0 = domenica). Non possono essere tutti e sette. */
  closedDays: number[];
  open: number;
  close: number;
  /** Pausa pranzo: inizio e fine, oppure -1 se l'orario è continuato. */
  breakStart: number;
  breakEnd: number;
};

export type HoursField = "open" | "close" | "breakStart" | "breakEnd";

/** Di quanto si muove ogni freccia, in minuti. */
export const STEP: Record<HoursField, number> = { open: 30, close: 30, breakStart: 15, breakEnd: 15 };

const LIMITS = (d: HoursDraft): Record<HoursField, [number, number]> => ({
  open: [360, d.close - 120],
  close: [d.open + 120, 1320],
  breakStart: [d.open + 30, d.breakEnd - 15],
  breakEnd: [d.breakStart + 15, d.close - 30],
});

export const hasBreak = (d: HoursDraft) => d.breakStart >= 0;

/** Sposta un orario di `delta` minuti dentro i limiti (apertura 6:00, chiusura 22:00, almeno 2 ore aperto). */
export function stepHours(d: HoursDraft, field: HoursField, delta: number): HoursDraft {
  const [lo, hi] = LIMITS(d)[field];
  return { ...d, [field]: Math.max(lo, Math.min(hi, d[field] + delta)) };
}

/** Apre o chiude un giorno. Almeno un giorno resta aperto. */
export function toggleDay(d: HoursDraft, weekday: number): HoursDraft {
  const closed = d.closedDays.includes(weekday) ? d.closedDays.filter((x) => x !== weekday) : [...d.closedDays, weekday];
  return closed.length >= 7 ? d : { ...d, closedDays: closed };
}

/** Accende la pausa (90 minuti verso le 13:00, dentro l'orario) o la toglie. */
export function setBreak(d: HoursDraft, on: boolean): HoursDraft {
  if (!on) return { ...d, breakStart: -1, breakEnd: -1 };
  if (hasBreak(d)) return d;
  const start = Math.max(d.open + 60, Math.min(780, d.close - 150));
  return { ...d, breakStart: start, breakEnd: start + 90 };
}

/** "Nuovo orario: 9:00–19:00, pausa 13:00–14:30. Agenda e link si aggiornano quando salvi." */
export function previewText(d: HoursDraft): string {
  const pause = hasBreak(d) ? `, pausa ${formatMinutes(d.breakStart)}–${formatMinutes(d.breakEnd)}` : ", orario continuato";
  return `Nuovo orario: ${formatMinutes(d.open)}–${formatMinutes(d.close)}${pause}. Agenda e link si aggiornano quando salvi.`;
}

export type Slot = { weekday: number; startMin: number; endMin: number };

/** Quanti appuntamenti restano fuori dal nuovo orario (giorno chiuso, fuori apertura, dentro la pausa). */
export function outsideHours(appts: Slot[], d: HoursDraft): number {
  return appts.filter(
    (a) =>
      d.closedDays.includes(a.weekday) ||
      a.startMin < d.open ||
      a.endMin > d.close ||
      (hasBreak(d) && a.startMin < d.breakEnd && a.endMin > d.breakStart),
  ).length;
}

const DAYS_ORDER = [1, 2, 3, 4, 5, 6, 0]; // da lunedì a domenica
const SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

/** "Mar – Sab" / "Lun, Mer – Ven" per i giorni aperti, raggruppando quelli consecutivi. */
export function openDaysLabel(closedDays: number[]): string {
  const runs: Array<[number, number]> = [];
  DAYS_ORDER.forEach((w, i) => {
    if (closedDays.includes(w)) return;
    const last = runs[runs.length - 1];
    if (last && last[1] === i - 1) last[1] = i;
    else runs.push([i, i]);
  });
  return runs
    .map(([a, b]) => (a === b ? SHORT[DAYS_ORDER[a]!]! : b === a + 1 ? `${SHORT[DAYS_ORDER[a]!]}, ${SHORT[DAYS_ORDER[b]!]}` : `${SHORT[DAYS_ORDER[a]!]} – ${SHORT[DAYS_ORDER[b]!]}`))
    .join(", ");
}
