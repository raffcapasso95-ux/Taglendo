import { addDays, dayNumber, weekdayShort } from "@/lib/dates/rome";
import { formatMinutes } from "./hours";

/** "oggi", "domani", "ven 30" (D5). */
export function dayWord(date: string, today: string): string {
  if (date === today) return "oggi";
  if (date === addDays(today, 1)) return "domani";
  return `${weekdayShort(date).toLowerCase()} ${dayNumber(date)}`;
}

/** Nuova prenotazione: "Luca Rossi · ven 30, 10:30 · Taglio e barba con Marco". */
export function newBookingLine(o: { client: string; date: string; today: string; startMin: number; service: string; barber: string | null }): string {
  return `${o.client} · ${dayWord(o.date, o.today)}, ${formatMinutes(o.startMin)} · ${o.service}${o.barber ? ` con ${o.barber}` : ""}`;
}

/** Annullamento: "Davide Ferri · oggi 15:30 · l’orario è di nuovo libero". */
export function cancelledLine(o: { client: string; date: string; today: string; startMin: number; free: string }): string {
  return `${o.client} · ${dayWord(o.date, o.today)} ${formatMinutes(o.startMin)} · ${o.free}`;
}

export type SummaryItem = { startMin: number; client: string; service: string };

/** Righe del riepilogo: "10:00 Luca Rossi · Taglio". Oltre il massimo, "e altri N". */
export function summaryLines(items: SummaryItem[], max = 12): string[] {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin);
  const lines = sorted.slice(0, max).map((i) => `${formatMinutes(i.startMin)} ${i.client} · ${i.service}`);
  if (sorted.length > max) lines.push(`e altri ${sorted.length - max}`);
  return lines;
}

/** Chi riceve un avviso: gli operatori solo i propri appuntamenti; il titolare tutti, salvo "solo i miei". */
export function receives(o: { role: "owner" | "barber"; onlyMine: boolean; isMine: boolean }): boolean {
  if (o.role === "barber") return o.isMine;
  return o.onlyMine ? o.isMine : true;
}

/** In quale ora di Roma parte cosa: riepilogo dalle 8, promemoria dalle 18 (con qualche ora di margine se un passaggio salta). */
export function dueJobs(romeHour: number): { summaries: boolean; reminders: boolean } {
  return { summaries: romeHour >= 8 && romeHour < 11, reminders: romeHour >= 18 && romeHour < 21 };
}
