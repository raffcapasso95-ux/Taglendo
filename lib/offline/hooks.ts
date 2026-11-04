"use client";

import { useMemo, useSyncExternalStore } from "react";
import { readQueue, type QueueItem, type Store } from "./queue";

const EVENT = "tg-queue";

/** Il magazzino del browser: ogni scrittura avvisa chi sta guardando la coda. */
export const browserStore: Store = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } finally {
      window.dispatchEvent(new Event(EVENT));
    }
  },
};

const subscribeQueue = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/** La coda, sempre aggiornata. Sul server è vuota. */
export function useQueue(): QueueItem[] {
  const raw = useSyncExternalStore(subscribeQueue, () => browserStore.getItem("tg-offline-queue") ?? "[]", () => "[]");
  return useMemo(() => readQueue({ getItem: () => raw, setItem: () => {} }), [raw]);
}

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** C'è la rete? Sul server e al primo disegno si dice di sì: così pagina e server coincidono. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}
