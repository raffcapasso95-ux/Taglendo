/** L'ultima ricerca vista in questa scheda, per poterci tornare dalla pagina di un salone. */
const KEY = "taglendo:ultima-ricerca";
const MAX_AGE_MS = 30 * 60 * 1000;

/** Solo pagine dei risultati: `/cerca…` e `/barbieri/città…`. */
export const isSearchUrl = (url: string) => /^\/(cerca|barbieri\/[a-z0-9-]+)(\?|$)/.test(url);

export function rememberSearch(url: string, now = Date.now()) {
  if (!isSearchUrl(url)) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ url, at: now }));
  } catch {
    // archivio bloccato (navigazione privata): si tornerà alla home
  }
}

/** L'indirizzo dell'ultima ricerca, se recente; altrimenti null. Va bene come snapshot: restituisce una stringa. */
export function lastSearch(now = Date.now()): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { url?: unknown; at?: unknown };
    if (typeof v.url !== "string" || typeof v.at !== "number" || now - v.at > MAX_AGE_MS || !isSearchUrl(v.url)) return null;
    return v.url;
  } catch {
    return null;
  }
}
