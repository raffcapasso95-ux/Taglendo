export const DELETE_WORD = "ELIMINA";

/** La parola di conferma va scritta intera: maiuscole o minuscole non contano, gli spazi ai bordi nemmeno. */
export const isDeleteConfirmed = (typed: string) => typed.trim().toUpperCase() === DELETE_WORD;

/** "oggi", "ieri", "3 giorni fa", "3 mesi fa", "2 anni fa" */
export function agoText(from: Date, now: Date): string {
  const days = Math.floor((now.getTime() - from.getTime()) / 86_400_000);
  if (days < 1) return "oggi";
  if (days === 1) return "ieri";
  if (days < 30) return `${days} giorni fa`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 mese fa" : `${months} mesi fa`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 anno fa" : `${years} anni fa`;
}
