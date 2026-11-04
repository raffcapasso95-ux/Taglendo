"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui";
import { company } from "@/lib/site";
import styles from "./States.module.css";

const NOUNS: Array<[RegExp, string]> = [
  [/^\/agenda/, "l’agenda"],
  [/^\/clienti/, "i clienti"],
  [/^\/listino/, "il listino"],
  [/^\/impostazioni/, "le impostazioni"],
  [/^\/link/, "il tuo link"],
  [/^\/profilo/, "il profilo"],
];

/** D3 · Errore di caricamento: cosa è successo e cosa fare, senza codici tecnici. */
export function ErrorState({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();
  const noun = NOUNS.find(([re]) => re.test(pathname))?.[1] ?? "la pagina";

  useEffect(() => {
    // lo si vede in Sentry (se attivo) e nei registri; all'utente non si mostra
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className={styles.error} role="alert">
      <span className={styles.errorIcon} aria-hidden="true">!</span>
      <h1 className={styles.errorTitle}>Non riusciamo a caricare {noun}</h1>
      <p className={styles.errorText}>
        Controlla la connessione e riprova. Se il problema continua, scrivici a <a href={`mailto:${company.email}`}>{company.email}</a>.
      </p>
      <div className={styles.errorActions}>
        <Button size="large" onClick={reset}>Riprova</Button>
      </div>
    </div>
  );
}
