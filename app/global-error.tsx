"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Ultima rete: un errore nel layout stesso. Pagina minima, senza codici tecnici. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="it">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "48px 24px", color: "#3E2532", background: "#FFF7F0" }}>
        <h1 style={{ fontSize: 24 }}>Qualcosa non ha funzionato</h1>
        <p>Ricarica la pagina. Se succede ancora scrivici: aiuto@taglendo.it</p>
      </body>
    </html>
  );
}
