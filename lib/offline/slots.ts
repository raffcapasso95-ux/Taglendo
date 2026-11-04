import { gridSlots } from "@/lib/rules/slots";
import type { Column, DayHours } from "@/lib/rules/agenda";

export type OfflineDay = { date: string; hours: DayHours; columns: Array<{ memberId: string; gaps: Array<[number, number]> }> };

/** Dalla fotografia del giorno ricava gli orari liberi, senza server. Con più barbieri basta che ne sia libero uno. */
export function offlineSlots(day: OfflineDay, durationMin: number, memberId: string | null, from = 0, step = 15) {
  const mine = memberId ? day.columns.filter((c) => c.memberId === memberId) : day.columns;
  const free = new Set<number>();
  for (const col of mine) {
    for (const [a, b] of col.gaps) {
      for (let t = a; t + durationMin <= b; t += 1) if ((t - day.hours.openMin) % step === 0) free.add(t);
    }
  }
  return gridSlots(day.hours, durationMin, free, from, step);
}

/** Quello che serve del giorno, in forma semplice da salvare. */
export function toOfflineDay(date: string, hours: DayHours, columns: Column[]): OfflineDay {
  return { date, hours, columns: columns.map((c) => ({ memberId: c.operator.id, gaps: c.gaps.map(([a, b]) => [a, b] as [number, number]) })) };
}
