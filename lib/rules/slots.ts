import type { DayHours } from "./agenda";

export type GridSlot = { startMin: number; free: boolean };

/**
 * Tutti gli orari di partenza possibili in un giorno (ogni `step` minuti, il servizio deve entrare
 * prima della chiusura e fuori dalla pausa), con il segno di quali sono liberi.
 * Serve al selettore degli orari: i liberi si scelgono, gli occupati si mostrano barrati.
 * `from` toglie il passato (per oggi).
 */
export function gridSlots(hours: DayHours, durationMin: number, freeStarts: ReadonlySet<number>, from = 0, step = 15): GridSlot[] {
  if (hours.closed) return [];
  const out: GridSlot[] = [];
  for (let t = hours.openMin; t + durationMin <= hours.closeMin; t += step) {
    if (t < from) continue;
    if (hours.breakStartMin != null && hours.breakEndMin != null && t < hours.breakEndMin && t + durationMin > hours.breakStartMin) continue;
    out.push({ startMin: t, free: freeStarts.has(t) });
  }
  return out;
}

export type Candidate = { date: string; startMin: number; memberId: string };

/**
 * I 3 orari liberi più vicini a quello desiderato: prima lo stesso giorno, poi i successivi.
 * Al massimo 2 per giorno, come nel prototipo.
 */
export function nearestAlternatives(candidates: Candidate[], wanted: { date: string; startMin: number }, max = 3): Candidate[] {
  const dayIndex = (d: string) => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000);
  const scored = candidates
    .filter((c) => !(c.date === wanted.date && c.startMin === wanted.startMin))
    .map((c) => ({ c, score: Math.abs(dayIndex(c.date) - dayIndex(wanted.date)) * 1440 + Math.abs(c.startMin - wanted.startMin) }))
    .sort((a, b) => a.score - b.score || a.c.date.localeCompare(b.c.date) || a.c.startMin - b.c.startMin);
  const perDay = new Map<string, number>();
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const { c } of scored) {
    const key = `${c.date}-${c.startMin}`;
    if (seen.has(key)) continue; // lo stesso orario con barbieri diversi si propone una volta
    if ((perDay.get(c.date) ?? 0) >= 2) continue;
    seen.add(key);
    perDay.set(c.date, (perDay.get(c.date) ?? 0) + 1);
    out.push(c);
    if (out.length === max) break;
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin);
}
