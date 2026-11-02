/** Gli inviti ai barbieri valgono 7 giorni (docs/04-regole.md). */
export const INVITE_DAYS = 7;

export type InviteStatus = "none" | "valid" | "expired";

/** Stato di un invito dalla sua scadenza. `now` serve solo ai test. */
export function inviteStatus(expiresAt: string | null, now: number = Date.now()): InviteStatus {
  if (expiresAt === null) return "none";
  return new Date(expiresAt).getTime() > now ? "valid" : "expired";
}

/** Scadenza di un invito creato adesso. */
export function inviteExpiry(now: number = Date.now()): string {
  return new Date(now + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}
