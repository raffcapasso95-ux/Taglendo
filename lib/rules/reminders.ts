/** Promemoria al cliente: quante ore prima dell'appuntamento (docs/04-regole.md, «Email e notifiche»). */
export const REMINDER_HOURS = [2, 4, 12, 24, 48] as const;
export type ReminderHours = (typeof REMINDER_HOURS)[number];
export const DEFAULT_REMINDER_HOURS: ReminderHours = 24;

export const isReminderHours = (h: unknown): h is ReminderHours => typeof h === "number" && (REMINDER_HOURS as readonly number[]).includes(h);

/** "2 ore", "24 ore", "48 ore". */
export const reminderLabel = (h: number) => `${h} ${h === 1 ? "ora" : "ore"}`;

const HOUR = 3_600_000;

/**
 * Il promemoria di un appuntamento è da mandare adesso?
 * - si apre `hours` ore prima dell'inizio e resta aperto fino all'inizio (se un giro salta, il successivo recupera);
 * - non parte se la prenotazione è stata fatta quando mancava già meno dell'anticipo scelto:
 *   il cliente ha appena ricevuto la conferma, un secondo messaggio sarebbe un doppione.
 */
export function reminderDue(o: { startsAt: Date; createdAt: Date; hours: number; now: Date }): boolean {
  const opensAt = o.startsAt.getTime() - o.hours * HOUR;
  if (o.now.getTime() >= o.startsAt.getTime()) return false;
  if (o.now.getTime() < opensAt) return false;
  return o.createdAt.getTime() < opensAt;
}

/** "Oggi alle 15:00", "Domani alle 9:30", "Giovedì 12 novembre alle 10:00": per l'oggetto e il titolo del promemoria. */
export function reminderDayWord(date: string, today: string, tomorrow: string): "oggi" | "domani" | "altro" {
  if (date === today) return "oggi";
  if (date === tomorrow) return "domani";
  return "altro";
}
