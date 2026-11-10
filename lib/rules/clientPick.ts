import { dayNumber, monthShort } from "@/lib/dates/rome";

/** Un cliente nella scelta di «Nuovo appuntamento». lastVisit: giorno (Roma) dell'ultima visita conclusa. */
export type PickClient = { id: string; name: string; phone: string | null; lastVisit: string | null };

export const normName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Le ultime 4 cifre del telefono, per distinguere due clienti con lo stesso nome. Null senza telefono (o senza permesso). */
export function phoneTail(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

/** "12 ott", oppure "12 ott 2025" se non è dell'anno in corso. */
export function visitLabel(date: string, today: string): string {
  const base = `${dayNumber(date)} ${monthShort(date).toLowerCase()}`;
  return date.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${date.slice(0, 4)}`;
}

/** I nomi (normalizzati) che compaiono più di una volta in rubrica. */
export function homonyms(clients: readonly PickClient[]): Set<string> {
  const seen = new Map<string, number>();
  for (const c of clients) seen.set(normName(c.name), (seen.get(normName(c.name)) ?? 0) + 1);
  return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
}

/** Più recenti prima; chi non è mai venuto in fondo, in ordine di nome. */
function byRecent(a: PickClient, b: PickClient): number {
  if (a.lastVisit !== b.lastVisit) {
    if (!a.lastVisit) return 1;
    if (!b.lastVisit) return -1;
    return a.lastVisit < b.lastVisit ? 1 : -1;
  }
  return a.name.localeCompare(b.name, "it");
}

/**
 * Chi proporre. Senza ricerca: gli ultimi venuti. Con la ricerca: nome o cognome che iniziano così (prima),
 * poi nomi che lo contengono; con almeno 3 cifre, anche le ultime cifre del telefono.
 */
export function pickClients<T extends PickClient>(clients: readonly T[], query: string, opts: { suggested: number; results: number }): T[] {
  const q = normName(query);
  if (!q) return [...clients].sort(byRecent).slice(0, opts.suggested);
  const digits = q.replace(/\D/g, "");
  const scored: { c: T; score: number }[] = [];
  for (const c of clients) {
    const name = normName(c.name);
    const words = name.split(" ");
    let score = 0;
    if (name.startsWith(q)) score = 3;
    else if (words.some((_, i) => words.slice(i).join(" ").startsWith(q))) score = 2;
    else if (name.includes(q)) score = 1;
    else if (digits.length >= 3 && digits.length === q.replace(/[\s+]/g, "").length && (c.phone ?? "").replace(/\D/g, "").endsWith(digits)) score = 2;
    if (score > 0) scored.push({ c, score });
  }
  return scored.sort((a, b) => b.score - a.score || byRecent(a.c, b.c)).slice(0, opts.results).map((s) => s.c);
}

/** Il cliente con lo stesso nome già in rubrica, se c'è: prima di crearne uno nuovo si chiede «è lui?». */
export function sameName<T extends PickClient>(clients: readonly T[], name: string): T | null {
  const n = normName(name);
  if (n.length < 2) return null;
  return [...clients].filter((c) => normName(c.name) === n).sort(byRecent)[0] ?? null;
}
