import { env } from "@/lib/supabase/env";

/**
 * Dati dell'azienda e contatti. Quelli tra parentesi quadre sono segnaposto da completare:
 * nel sito compaiono evidenziati finché non li sostituisci qui (design G2).
 */
export const company = {
  name: "Taglendo",
  legalName: "[ragione sociale]",
  vat: "[00000000000]",
  address: "[indirizzo]",
  email: "aiuto@taglendo.it",
  hours: "Lun–Ven · 9–18",
  updated: "5 novembre 2026",
} as const;

export const isPlaceholder = (value: string) => value.startsWith("[") && value.endsWith("]");

export const siteUrl = () => env.siteUrl();
