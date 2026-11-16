/**
 * Prova e accesso.
 *
 * La prova dura 30 giorni dalla registrazione. A prova finita (e senza abbonamento attivo) il salone è «bloccato»:
 * si vedono gli appuntamenti già fissati, ma non si può aggiungere o cambiare altro, la pagina pubblica non è più visibile
 * e non si prenota online. Lo stesso vale per un salone sospeso da Taglendo. Il blocco lo impone il database
 * (`private.salon_lock`); qui c'è la stessa regola per decidere cosa mostrare.
 * Vale anche con i pagamenti spenti: la prova esiste e scade. `billingEnabled` riguarda solo le schermate dell'abbonamento.
 */

export const TRIAL_DAYS = 30;
/** Da quanti giorni prima della scadenza si mostra l'avviso. */
export const TRIAL_WARNING_DAYS = 7;

export function billingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

export type AccessInput = {
  sub_status: "trialing" | "active" | "past_due" | "canceled" | "expired";
  trial_ends_at: string;
  suspended_at?: string | null;
};

export type SalonLock = "suspended" | "trial_ended" | null;

/** Perché il salone è bloccato, o null se è aperto. `now` serve solo ai test. */
export function salonLock(salon: AccessInput, now: number = Date.now()): SalonLock {
  if (salon.suspended_at) return "suspended";
  if (salon.sub_status === "active" || salon.sub_status === "past_due") return null;
  if (salon.sub_status === "trialing" && new Date(salon.trial_ends_at).getTime() > now) return null;
  return "trial_ended";
}

/** Il salone può usare tutte le funzioni (prenotazioni online comprese)? */
export function hasActiveAccess(salon: AccessInput, now: number = Date.now()): boolean {
  return salonLock(salon, now) === null;
}

/** La prova è in corso e finisce entro `TRIAL_WARNING_DAYS` giorni (di calendario, ora di Roma)? Torna i giorni che mancano (0 = oggi). */
export function trialWarning(salon: AccessInput, now: number = Date.now()): number | null {
  if (salon.sub_status !== "trialing" || salonLock(salon, now) !== null) return null;
  const day = (t: number) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date(t));
  const days = Math.round((Date.parse(`${day(new Date(salon.trial_ends_at).getTime())}T12:00:00Z`) - Date.parse(`${day(now)}T12:00:00Z`)) / 86400000);
  return days <= TRIAL_WARNING_DAYS ? Math.max(0, days) : null;
}
