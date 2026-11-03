/** Controlli dei campi, uguali nel browser e sul server. Limiti da docs/04-regole.md. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const LIMITS = {
  salonName: 60,
  memberName: 40,
  serviceName: 60,
  clientName: 60,
  phone: 20,
  email: 254,
  clientNote: 500,
} as const;

export const isEmail = (value: string) => value.length <= LIMITS.email && EMAIL.test(value.trim());

/** Nome di persona: almeno 2 caratteri. */
export const isPersonName = (value: string, max: number = LIMITS.clientName) => {
  const v = value.trim();
  return v.length >= 2 && v.length <= max;
};

/** Telefono: solo cifre, + e spazi, al massimo 20 caratteri. */
export const isPhone = (value: string) => /^[0-9+ ]+$/.test(value.trim()) && value.trim().length <= LIMITS.phone;

/** Il codice di conferma: esattamente 6 cifre (si accetta anche incollato con spazi). */
export const normalizeCode = (value: string) => value.replace(/\s+/g, "");
export const isCode = (value: string) => /^\d{6}$/.test(normalizeCode(value));

/** Percorso interno sicuro per il parametro ?next= (niente redirect verso altri siti). */
export function safeNext(value: string | null | undefined, fallback = "/agenda"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
