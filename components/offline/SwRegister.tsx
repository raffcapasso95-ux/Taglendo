"use client";

import { useEffect } from "react";

/** Registra il service worker che tiene l'app e l'ultima agenda per quando manca la rete. Solo in produzione. */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js?cache=1").catch(() => {});
  }, []);
  return null;
}
