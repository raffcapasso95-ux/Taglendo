/** Lunghezza minima: la stessa di supabase/config.toml (minimum_password_length). */
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordLevel = "short" | "weak" | "fair" | "good" | "great";

/** Etichette mostrate sotto il campo (livelli approvati; "Buona" è nei design). */
export const PASSWORD_LABELS: Record<Exclude<PasswordLevel, "short">, string> = {
  weak: "Debole",
  fair: "Discreta",
  good: "Buona",
  great: "Ottima",
};

/** Quante delle 4 barre si riempiono. */
export const PASSWORD_BARS: Record<PasswordLevel, number> = {
  short: 0,
  weak: 1,
  fair: 2,
  good: 3,
  great: 4,
};

const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwertyui", "qwerty123", "abcd1234", "iloveyou", "11111111", "00000000",
  "taglendo", "taglendo1", "barberia", "barberia1", "calcio123", "juventus", "forzaroma",
]);

/**
 * Robustezza di una password. Sotto la lunghezza minima non c'è etichetta
 * ("short") e il modulo resta bloccato; da lì in su conta la varietà dei
 * caratteri e la lunghezza.
 */
export function passwordLevel(password: string): PasswordLevel {
  if (password.length < PASSWORD_MIN_LENGTH) return "short";
  if (COMMON.has(password.toLowerCase())) return "weak";
  if (/^(.)\1+$/.test(password)) return "weak";

  const classes =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));
  const points = classes + (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0);

  if (points <= 1) return "weak";
  if (points === 2) return "fair";
  if (points === 3) return "good";
  return "great";
}
