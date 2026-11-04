/** Ferie e chiusure: come si scrivono le date (C2) e quando una chiusura è passata. */

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MONTHS_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const parts = (date: string) => ({ y: +date.slice(0, 4), m: +date.slice(5, 7) - 1, d: +date.slice(8, 10) });
const weekday = (date: string) => {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m, d)).getUTCDay();
};

/**
 * `Mer 19 novembre` · `9 – 23 agosto 2027` · `24 dic – 1 gennaio`.
 * L'anno compare solo se non è quello in corso.
 */
export function closureRangeLabel(startsOn: string, endsOn: string, currentYear: number): string {
  const a = parts(startsOn);
  const b = parts(endsOn);
  const year = (y: number) => (y === currentYear ? "" : ` ${y}`);
  if (startsOn === endsOn) return `${WEEKDAYS_SHORT[weekday(startsOn)]} ${a.d} ${MONTHS[a.m]}${year(a.y)}`;
  if (a.y === b.y && a.m === b.m) return `${a.d} – ${b.d} ${MONTHS[b.m]}${year(b.y)}`;
  return `${a.d} ${MONTHS_SHORT[a.m]}${a.y !== b.y ? year(a.y) : ""} – ${b.d} ${MONTHS[b.m]}${year(b.y)}`;
}

/** Una chiusura è passata se è finita prima di oggi. */
export const isPastClosure = (endsOn: string, today: string) => endsOn < today;

export type ClosureRow = { id: string; startsOn: string; endsOn: string; memberId: string | null; note: string | null };

/** In programma (la più vicina prima) e passate (la più recente prima). */
export function splitClosures<T extends ClosureRow>(rows: T[], today: string): { upcoming: T[]; past: T[] } {
  const upcoming = rows.filter((r) => !isPastClosure(r.endsOn, today)).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const past = rows.filter((r) => isPastClosure(r.endsOn, today)).sort((a, b) => b.startsOn.localeCompare(a.startsOn));
  return { upcoming, past };
}
