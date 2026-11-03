/**
 * Pagamenti e accesso.
 *
 * Nella beta gratuita i pagamenti sono spenti (`BILLING_ENABLED` non è "true"):
 * ogni salone ha l'accesso completo, senza scadenza. Quando si accendono, valgono
 * le regole di docs/04-regole.md (prova di 15 giorni, piani Solo e Salone).
 * Quando succede, ai saloni della beta si dà una nuova prova di 15 giorni
 * (vedi docs/05-fasi-e-prompt.md, "Rilascio gratuito").
 */

export function billingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

export type AccessInput = {
  sub_status: "trialing" | "active" | "past_due" | "canceled" | "expired";
  trial_ends_at: string;
};

/**
 * Il salone può usare tutte le funzioni (prenotazioni online comprese)?
 * Con i pagamenti spenti sì, sempre. `enabled` e `now` servono solo ai test.
 */
export function hasActiveAccess(
  salon: AccessInput,
  enabled: boolean = billingEnabled(),
  now: number = Date.now(),
): boolean {
  if (!enabled) return true;
  switch (salon.sub_status) {
    case "active":
      return true;
    case "trialing":
      return new Date(salon.trial_ends_at).getTime() > now;
    case "past_due":
      // I 7 giorni di tolleranza per il pagamento non riuscito arrivano con la Fase 6.
      return true;
    default:
      return false;
  }
}
