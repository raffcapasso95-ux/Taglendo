/** Quanto deve essere lungo (px) e veloce (ms) uno scorrimento orizzontale per cambiare giorno. */
export const SWIPE_MIN_DISTANCE = 70;
export const SWIPE_MAX_MS = 700;

/**
 * Cosa vuol dire un gesto: -1 = giorno prima, 1 = giorno dopo, 0 = niente.
 * Conta solo se è abbastanza lungo, abbastanza veloce e più orizzontale che verticale
 * (altrimenti è chi scorre l'agenda in su e in giù).
 */
export function swipeTarget(dx: number, dy: number, ms: number): -1 | 0 | 1 {
  if (ms > SWIPE_MAX_MS || Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.6) return 0;
  return dx < 0 ? 1 : -1; // verso sinistra = giorno dopo, verso destra = giorno prima
}
