"use client";

import { QUEUE_KEY, SAVED_KEY } from "./queue";

/** All'uscita: via la coda, l'ora di salvataggio e le pagine tenute per l'uso offline. Su un telefono condiviso non deve restare niente. */
export function clearOfflineData(): void {
  try {
    window.localStorage.removeItem(QUEUE_KEY);
    window.localStorage.removeItem(SAVED_KEY);
  } catch {
    // niente da togliere
  }
  if ("caches" in window) void window.caches.delete("tg-pages");
}
