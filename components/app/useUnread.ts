"use client";

import { useEffect, useState } from "react";
import { unreadCount } from "@/lib/activity/actions";

const EVERY_MS = 30_000;

/**
 * Il numero della campanella sempre aggiornato: parte da quello della pagina, poi si richiede
 * cambiando pagina, ogni 30 secondi e quando si torna sulla scheda (es. una prenotazione online appena arrivata).
 */
export function useUnread(fromServer: number, pathname: string): number {
  const [count, setCount] = useState(fromServer);
  const [prev, setPrev] = useState(fromServer);
  if (prev !== fromServer) {
    setPrev(fromServer);
    setCount(fromServer);
  }

  useEffect(() => {
    let alive = true;
    const ask = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      unreadCount()
        .then((n) => alive && setCount(n))
        .catch(() => {});
    };
    ask();
    const timer = window.setInterval(ask, EVERY_MS);
    document.addEventListener("visibilitychange", ask);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ask);
    };
  }, [pathname]);

  // sulla pagina delle notifiche sono lette nel momento in cui si guardano
  return pathname === "/notifiche" ? 0 : count;
}
