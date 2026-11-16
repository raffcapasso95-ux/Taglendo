import { adminCopy } from "@/lib/copy/admin";
import type { SalonRow } from "@/lib/admin/load";

const rome = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", ...opts });

/** «16 nov 2026» */
export const dateLabel = (iso: string) => rome({ day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
/** «16 nov 2026, 14:05» */
export const dateTimeLabel = (iso: string) => rome({ day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Quanto tempo fa: «oggi», «ieri», «5 giorni fa», altrimenti la data. */
export function agoLabel(iso: string | null, now = Date.now()): string {
  if (!iso) return adminCopy.list.never;
  const days = Math.floor((now - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 30) return `${days} giorni fa`;
  return dateLabel(iso);
}

export const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);

export const clock = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

/** Il segno di stato di un salone: testo e colore. */
export function stateBadge(row: Pick<SalonRow, "state" | "trial_ends_at">, now = Date.now()): { text: string; tone: "ok" | "warn" | "bad" | "plain" } {
  switch (row.state) {
    case "suspended":
      return { text: adminCopy.badges.suspended, tone: "bad" };
    case "incomplete":
      return { text: adminCopy.badges.incomplete, tone: "warn" };
    case "active":
      return { text: adminCopy.badges.active, tone: "ok" };
    case "trialing":
      return { text: adminCopy.badges.trialing(Math.ceil((new Date(row.trial_ends_at).getTime() - now) / 86400000)), tone: "plain" };
    default:
      return { text: adminCopy.badges.expired, tone: "warn" };
  }
}

/** Giorni che mancano a una data (arrotondati per eccesso; negativi se è passata). */
export const daysLeft = (iso: string, now = Date.now()) => Math.ceil((new Date(iso).getTime() - now) / 86400000);
