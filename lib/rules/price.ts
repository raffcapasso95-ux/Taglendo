/** Prezzo per un cliente: sconti rapidi, lettura di quello che si scrive e riepilogo. Importi in centesimi. */

const MAX_PRICE_CENTS = 1_000_000;

/** «25», «25,5», «25.50» → centesimi; vuoto o non valido → null. */
export function parseEuros(text: string): number | null {
  const t = text.trim().replace(/\s/g, "").replace("€", "").replace(",", ".");
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(t)) return null;
  const cents = Math.round(Number(t) * 100);
  return cents >= 0 && cents <= MAX_PRICE_CENTS ? cents : null;
}

/** Il campo «Prezzo per questo cliente (€)»: 2500 → «25», 1250 → «12,50». */
export function eurosText(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
}

export type QuickPrice = { key: "full" | "m10" | "m20" | "free"; label: string; cents: number };

/** Le scorciatoie: prezzo pieno, −10%, −20%, omaggio. */
export function quickPrices(listCents: number): QuickPrice[] {
  const off = (pct: number) => Math.round((listCents * (100 - pct)) / 100);
  return [
    { key: "full", label: "Prezzo pieno", cents: listCents },
    { key: "m10", label: "−10%", cents: off(10) },
    { key: "m20", label: "−20%", cents: off(20) },
    { key: "free", label: "Omaggio", cents: 0 },
  ];
}
