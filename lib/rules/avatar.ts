/** Avatar dei clienti: iniziali su un colore. Il colore è scelto dal salone o, se manca, ricavato dal nome. */

/** Quanti colori ci sono: Pesca, Prugna, Salvia, Sabbia, Lavanda. */
const AVATAR_COLORS = 5;
export const AVATAR_COLOR_NAMES = ["Pesca", "Prugna", "Salvia", "Sabbia", "Lavanda"] as const;

/** Lo stesso nome dà sempre lo stesso colore (senza distinguere maiuscole e accenti). */
export function colorFromName(name: string): number {
  const key = name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return h % AVATAR_COLORS;
}

/** Il colore da mostrare: quello scelto (0–4) o quello del nome. */
export const avatarColor = (name: string, chosen: number | null | undefined): number =>
  chosen != null && Number.isInteger(chosen) && chosen >= 0 && chosen < AVATAR_COLORS ? chosen : colorFromName(name);

/** Le iniziali: la prima lettera delle prime due parole («Alessio Ricci» → «AR»). */
export function clientInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w));
  return words.slice(0, 2).map((w) => [...w].find((c) => /\p{L}/u.test(c))!).join("").toUpperCase() || "?";
}
