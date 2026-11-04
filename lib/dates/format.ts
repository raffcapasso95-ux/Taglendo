/** Fuso orario in cui si mostrano tutti gli orari (nel database sono in UTC). */
export const TIME_ZONE = "Europe/Rome";

const dayShort = new Intl.DateTimeFormat("it-IT", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "long",
});

const time = new Intl.DateTimeFormat("it-IT", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** `Ven 30 ottobre` */
export function formatDay(date: Date): string {
  const parts = dayShort.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${capitalize(get("weekday").replace(".", ""))} ${get("day")} ${get("month")}`;
}

/** `09:30` */
export function formatTime(date: Date): string {
  return time.format(date);
}

/** `20 €`, `9,90 €` — i prezzi sono sempre in centesimi. */
export function formatPrice(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

const dayMonth = new Intl.DateTimeFormat("it-IT", { timeZone: TIME_ZONE, day: "numeric", month: "long" });

/** `13 novembre` */
export function formatDayMonth(date: Date): string {
  return dayMonth.format(date);
}
