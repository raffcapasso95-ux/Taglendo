/** Link riservati alle rotte del sito. Va tenuto uguale a salons_slug_not_reserved nel database. */
const RESERVED_SLUGS = [
  "accedi", "registrati", "verifica", "password", "nuova-password", "invito", "primo-avvio", "pronto",
  "agenda", "clienti", "link", "listino", "impostazioni", "profilo", "salone", "statistiche", "notifiche",
  "privacy", "termini", "cookie", "api", "auth", "dev", "admin", "app", "www", "taglendo",
] as const;

const SLUG_MAX_LENGTH = 60;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Barberia Saragozza" → "barberia-saragozza". Toglie accenti e simboli. */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
  if (!slug) return "salone";
  return isReserved(slug) ? `${slug}-salone` : slug;
}

function isReserved(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug);
}

/** Valido per il database: minuscole, numeri e trattini singoli, non riservato. */
export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug) && !isReserved(slug);
}
