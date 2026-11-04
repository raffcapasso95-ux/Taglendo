import { dayNumber, longDay, romeDate, romeMinutes, weekdayName, weekdayShort } from "@/lib/dates/rome";
import { formatMinutes as clock } from "./hours";

const monthLong = (date: string) => longDay(date).split(" ").slice(2).join(" "); // "ottobre"

/** `venerdì 30 ottobre alle 10:30` (oggetto della conferma) */
export const whenLong = (date: string, min: number) => `${longDay(date).toLowerCase()} alle ${clock(min)}`;

/** `Ven 30 ottobre, 10:30` (riga "Quando") */
export const whenShort = (date: string, min: number) => `${weekdayShort(date)} ${dayNumber(date)} ${monthLong(date)}, ${clock(min)}`;

/** `venerdì alle 8:30`: fino a quando si può annullare, dato l'inizio e il limite del salone. */
export function cancelLimitText(startsAt: Date, limitMin: number): string {
  const limit = new Date(startsAt.getTime() - limitMin * 60000);
  return `${weekdayName(romeDate(limit)).toLowerCase()} alle ${clock(romeMinutes(limit))}`;
}
