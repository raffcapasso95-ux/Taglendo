/**
 * Rubrica dei clienti: lettere, ricerca, "da richiamare", targhette.
 * Regole e testi da design/Taglendo App.dc.html (scheda Clienti) e docs/04-regole.md.
 */
import { dayNumber, monthShort, weekdayShort } from "@/lib/dates/rome";

export type ClientRow = {
  id: string;
  name: string;
  /** Solo se chi guarda può vedere i contatti. */
  phone: string | null;
  email: string | null;
  /** Data di creazione, ISO. */
  createdAt: string;
  visits: number;
  /** Ultima visita completata, giorno di Roma (2026-10-22). */
  lastVisitDate: string | null;
  /** Prossimo appuntamento confermato: giorno di Roma e minuti dalla mezzanotte. */
  nextDate: string | null;
  nextMin: number | null;
  usualServiceName: string | null;
  usualMemberName: string | null;
  /** Ha un appuntamento oggi (qualunque stato tranne annullato). */
  hasToday: boolean;
  /** Colore delle iniziali scelto dal salone (0–4); senza, si ricava dal nome. */
  avatarColor: number | null;
  /** Foto (indirizzo firmato) se c'è. */
  photoUrl: string | null;
};

/** Non vengono da 5 settimane: da richiamare. */
export const RECALL_DAYS = 35;

export type ClientFilter = "all" | "today" | "recall";

export const normalizeText = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const digitsOf = (s: string) => s.replace(/\D/g, "");

/**
 * Nome (anche solo parte delle parole, in qualunque ordine, senza badare agli accenti)
 * oppure almeno 3 cifre contenute nel telefono.
 */
export function matchesClient(c: Pick<ClientRow, "name" | "phone">, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const name = normalizeText(c.name);
  const words = normalizeText(q).split(/\s+/).filter(Boolean);
  if (words.every((w) => name.includes(w))) return true;
  const digits = digitsOf(q);
  return digits.length >= 3 && c.phone !== null && digitsOf(c.phone).includes(digits);
}

/** Lettera sotto cui sta il nome: la prima lettera senza accento, "#" se non ce ne sono (numeri, emoji). */
export function letterOf(name: string): string {
  const stripped = name.trim().replace(/^[^\p{L}]+/u, "");
  const first = Array.from(stripped)[0];
  if (!first) return "#";
  const base = first.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  return /^[A-Z]$/.test(base) ? base : "#";
}

const collator = new Intl.Collator("it", { sensitivity: "base", ignorePunctuation: true });

/** Rubrica in ordine alfabetico, divisa per lettera; i nomi senza lettere in fondo sotto "#". */
export function groupByLetter<T extends Pick<ClientRow, "name">>(rows: T[]): Array<{ letter: string; rows: T[] }> {
  const sorted = [...rows].sort((a, b) => {
    const la = letterOf(a.name);
    const lb = letterOf(b.name);
    if ((la === "#") !== (lb === "#")) return la === "#" ? 1 : -1;
    return collator.compare(a.name, b.name);
  });
  const groups: Array<{ letter: string; rows: T[] }> = [];
  for (const row of sorted) {
    const letter = letterOf(row.name);
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.rows.push(row);
    else groups.push({ letter, rows: [row] });
  }
  return groups;
}

/** Giorni interi tra due date "2026-10-22" e "2026-11-03". */
export function daysBetween(from: string, to: string): number {
  const t = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((t(to) - t(from)) / 86400000);
}

/** Non viene da almeno 5 settimane e non ha appuntamenti in programma. */
export function isRecall(c: Pick<ClientRow, "lastVisitDate" | "nextDate">, today: string): boolean {
  return c.lastVisitDate !== null && c.nextDate === null && daysBetween(c.lastVisitDate, today) >= RECALL_DAYS;
}

export function applyFilter<T extends ClientRow>(rows: T[], filter: ClientFilter, today: string): T[] {
  if (filter === "today") return rows.filter((c) => c.hasToday);
  if (filter === "recall") return rows.filter((c) => isRecall(c, today));
  return rows;
}

const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export type Chip = { text: string; tone: "next" | "recall" | "plain" };

/** La targhetta di una riga: prossimo appuntamento, da richiamare, servito oggi, ultima visita, nuovo. */
export function rowChip(c: ClientRow, today: string): Chip {
  if (c.nextDate && c.nextMin !== null) {
    const when = c.nextDate === today ? "Oggi" : `${weekdayShort(c.nextDate)} ${dayNumber(c.nextDate)} ${monthShort(c.nextDate)}`;
    return { text: `${when} alle ${clock(c.nextMin)}`, tone: "next" };
  }
  if (isRecall(c, today)) {
    const weeks = Math.round(daysBetween(c.lastVisitDate!, today) / 7);
    return { text: `Da richiamare · ${weeks} settimane`, tone: "recall" };
  }
  if (c.lastVisitDate === today) return { text: "Servito oggi", tone: "plain" };
  if (c.lastVisitDate) return { text: `Ultima visita ${dayNumber(c.lastVisitDate)} ${monthShort(c.lastVisitDate)}`, tone: "plain" };
  return { text: "Nuovo cliente", tone: "plain" };
}

/** "Il solito · Taglio uomo · Andrea" (il barbiere solo se ce n'è più di uno). */
export function usualLine(c: Pick<ClientRow, "usualServiceName" | "usualMemberName">, multipleOperators: boolean): string {
  if (!c.usualServiceName) return "Ancora nessun servizio";
  return `Il solito · ${c.usualServiceName}${multipleOperators && c.usualMemberName ? ` · ${c.usualMemberName}` : ""}`;
}

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/** "Cliente da marzo 2024 · 14 visite" */
export function clientSinceLine(createdDate: string, visits: number): string {
  return `Cliente da ${MONTHS[+createdDate.slice(5, 7) - 1]} ${createdDate.slice(0, 4)} · ${visits} ${visits === 1 ? "visita" : "visite"}`;
}

/** Testi WhatsApp del prototipo: per chi non viene da un po', e un saluto da completare. */
export function recallMessage(first: string): string {
  return `Ciao ${first}, è da un po’ che non ci vediamo! Ti tengo un posto questa settimana?`;
}
export const greetingMessage = (first: string) => `Ciao ${first}, `;
