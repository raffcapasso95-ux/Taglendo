"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Tiene l'agenda aggiornata: ogni minuto (la riga dell'ora si muove) e quando si torna sulla scheda. */
export function AutoRefresh({ everyMs = 60_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      // senza rete si lascia l'agenda com'è: ricaricarla la romperebbe
      if (document.visibilityState === "visible" && navigator.onLine) router.refresh();
    };
    const timer = window.setInterval(refresh, everyMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, everyMs]);
  return null;
}
