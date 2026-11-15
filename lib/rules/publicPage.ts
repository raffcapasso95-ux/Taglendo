import { formatMinutes, rangesOf, rangesText, type DayHours } from "./hours";

const DAY_NAMES = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

/** 540 → "9", 570 → "9:30" (come nelle righe brevi del design: "Mar–Sab · 9–19"). */
const shortTime = (min: number) => (min % 60 === 0 ? String(min / 60) : formatMinutes(min));

/** Telefono del salone come indirizzo `tel:`: "051 644 2190" → "tel:+390516442190". */
export function phoneHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits.startsWith("+") ? digits : `+39${digits}`}`;
}

export const mapsHref = (address: string | null, area: string | null) =>
  address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, area].filter(Boolean).join(", "))}` : null;

/** Giorni consecutivi con lo stesso orario, per la riga sotto il titolo: "Mar–Sab · 9–19". Vuoto se sempre chiuso. */
export function shortHours(week: DayHours[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const text = (d: DayHours) => (d.closed || d.openMin == null || d.closeMin == null ? "" : `${shortTime(d.openMin)}–${shortTime(d.closeMin)}`);
  const groups: Array<{ days: number[]; value: string }> = [];
  for (const day of order) {
    const value = text(week[day]!);
    const last = groups[groups.length - 1];
    if (last && last.value === value) last.days.push(day);
    else groups.push({ days: [day], value });
  }
  const open = groups.filter((g) => g.value);
  if (open.length === 0) return "";
  const main = open.reduce((a, b) => (b.days.length > a.days.length ? b : a));
  const label = main.days.length === 1 ? DAY_SHORT[main.days[0]!]! : `${DAY_SHORT[main.days[0]!]}–${DAY_SHORT[main.days[main.days.length - 1]!]}`;
  return `${label} · ${main.value}`;
}

export type HoursLine = { day: string; time: string; today: boolean };

/** Le righe degli orari, da lunedì a domenica, con "Chiuso" nei giorni di riposo. */
export function hoursLines(week: DayHours[], todayWeekday: number): HoursLine[] {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => {
    return { day: DAY_NAMES[d]!, time: rangesText(week[d]!), today: d === todayWeekday };
  });
}

/** Una riga sola con gli orari del giorno tipo: "Mar–Sab · 9–13 e 14:30–19". */
export function typicalHoursLine(week: DayHours[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const text = (d: DayHours) =>
    rangesOf(d)
      .map(([a, b]) => `${shortTime(a)}–${shortTime(b)}`)
      .join(" e ");
  const groups: Array<{ days: number[]; value: string }> = [];
  for (const day of order) {
    const value = text(week[day]!);
    const last = groups[groups.length - 1];
    if (last && last.value === value) last.days.push(day);
    else groups.push({ days: [day], value });
  }
  const open = groups.filter((g) => g.value);
  if (open.length === 0) return "";
  const main = open.reduce((a, b) => (b.days.length > a.days.length ? b : a));
  const label = main.days.length === 1 ? DAY_SHORT[main.days[0]!]! : `${DAY_SHORT[main.days[0]!]}–${DAY_SHORT[main.days[main.days.length - 1]!]}`;
  return `${label} · ${main.value}`;
}

export type OpenSign = { open: boolean; title: string; line: string };

/** Il cartello "Aperto / Chiuso" in base a giorno e ora di Roma. */
export function openSign(week: DayHours[], weekday: number, nowMin: number): OpenSign {
  const today = week[weekday]!;
  const isOpenDay = !today.closed && today.openMin != null && today.closeMin != null;
  if (isOpenDay) {
    const pause = today.breaks.find(([from, to]) => nowMin >= from && nowMin < to);
    if (pause) return { open: false, title: "Pausa", line: `riapriamo alle ${formatMinutes(pause[1])}` };
    if (nowMin >= today.openMin! && nowMin < today.closeMin!) {
      const next = today.breaks.find(([from]) => nowMin < from)?.[0] ?? today.closeMin!;
      return { open: true, title: "Aperto", line: `oggi fino alle ${formatMinutes(next)}` };
    }
    if (nowMin < today.openMin!) return { open: false, title: "Chiuso", line: `apriamo alle ${formatMinutes(today.openMin!)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (weekday + i) % 7;
    const h = week[d]!;
    if (!h.closed && h.openMin != null) return { open: false, title: "Chiuso", line: `riapriamo ${i === 1 ? "domani" : DAY_NAMES[d]!.toLowerCase()} alle ${formatMinutes(h.openMin)}` };
  }
  return { open: false, title: "Chiuso", line: "" };
}

/** Il prezzo più basso del listino, in centesimi; null se il listino è vuoto. */
export const fromPriceCents = (services: Array<{ priceCents: number }>) => (services.length ? Math.min(...services.map((s) => s.priceCents)) : null);

/* ── Ridisegno del sito (novembre 2026): pagina del salone ─────────────────────────────── */

const DAY_ABBR = ["dom.", "lun.", "mar.", "mer.", "gio.", "ven.", "sab."];
const DAY_LOWER = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

/** «a, b e c» */
export const andList = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`);

export type StatusPill = { open: boolean; text: string; short: string };

/**
 * La pillola di stato in testa alla pagina: «Aperto ora · chiude alle 19:30», «In pausa · riapre alle 14:30»,
 * «Chiuso · apre alle 9:00», «Chiuso · riapre martedì alle 9:00». `short` è per la barra in basso del telefono.
 */
export function statusPill(week: DayHours[], weekday: number, nowMin: number): StatusPill {
  const ranges = rangesOf(week[weekday]!);
  const now = ranges.find(([a, b]) => nowMin >= a && nowMin < b);
  if (now) return { open: true, text: `Aperto ora · chiude alle ${formatMinutes(now[1])}`, short: `Aperto · chiude alle ${formatMinutes(now[1])}` };
  const later = ranges.find(([a]) => a > nowMin);
  if (later) {
    const paused = ranges.some(([, b]) => b <= nowMin);
    const text = paused ? `In pausa · riapre alle ${formatMinutes(later[0])}` : `Chiuso · apre alle ${formatMinutes(later[0])}`;
    return { open: false, text, short: text };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (weekday + i) % 7;
    const first = rangesOf(week[d]!)[0];
    if (first) {
      const text = `Chiuso · riapre ${i === 1 ? "domani" : DAY_LOWER[d]} alle ${formatMinutes(first[0])}`;
      return { open: false, text, short: text };
    }
  }
  return { open: false, text: "Chiuso", short: "Chiuso" };
}

/** «Oggi 9:00–19:30» (dalla prima apertura all'ultima chiusura) o «Oggi chiuso». */
export function todayLine(week: DayHours[], weekday: number): string {
  const r = rangesOf(week[weekday]!);
  return r.length ? `Oggi ${formatMinutes(r[0]![0])}–${formatMinutes(r[r.length - 1]![1])}` : "Oggi chiuso";
}

/** I giorni di riposo, da lunedì: «Chiuso dom. e lun.», «Aperto tutti i giorni». */
export function closedDaysLine(week: DayHours[]): string {
  const closed = [1, 2, 3, 4, 5, 6, 0].filter((d) => rangesOf(week[d]!).length === 0);
  if (closed.length === 0) return "Aperto tutti i giorni";
  if (closed.length === 7) return "Orari non ancora indicati";
  // in ordine di settimana ma con la domenica prima del lunedì quando sono di fila (come nel design: «dom. e lun.»)
  const order = closed.includes(0) && closed.includes(1) ? [0, ...closed.filter((d) => d !== 0)] : closed;
  return `Chiuso ${andList(order.map((d) => DAY_ABBR[d]!))}`;
}

/** «3 barbieri» · «Chiara, Fabio e Kevin». */
export function barbersLine(names: string[]): { count: string; names: string } {
  return { count: names.length === 1 ? "1 barbiere" : `${names.length} barbieri`, names: andList(names) };
}

export type KnowInput = {
  specialties: string | null;
  paymentMethods: string[];
  products: string | null;
  kidsUntil: number | null;
  stepFreeAccess: boolean | null;
  cancelOnline: boolean;
  cancelLimitMin: number;
};

const PAYMENT_ORDER = ["contanti", "carta", "bancomat", "satispay"];
const PAYMENT_LABEL: Record<string, string> = { contanti: "contanti", carta: "carta", bancomat: "bancomat", satispay: "Satispay" };

/**
 * Le righe di «Da sapere», solo quelle compilate dal salone. «Disdette» si ricava dalle regole di annullamento,
 * ma compare solo se il salone ha scritto almeno un'altra riga (altrimenti la sezione si nasconde).
 */
export function knowRows(k: KnowInput): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (k.specialties?.trim()) rows.push({ label: "Specialità", value: k.specialties.trim() });
  const pay = PAYMENT_ORDER.filter((p) => k.paymentMethods.includes(p)).map((p) => PAYMENT_LABEL[p]!);
  if (pay.length) rows.push({ label: "Pagamento", value: `In salone: ${andList(pay)}` });
  if (k.products?.trim()) rows.push({ label: "Prodotti", value: k.products.trim() });
  if (k.kidsUntil != null) rows.push({ label: "Bambini", value: `Sì, fino a ${k.kidsUntil} anni` });
  if (k.stepFreeAccess != null) rows.push({ label: "Accesso", value: k.stepFreeAccess ? "Ingresso senza gradini" : "Ingresso con gradini" });
  if (rows.length === 0) return rows;
  rows.push({
    label: "Disdette",
    value: k.cancelOnline ? `Gratis fino a ${k.cancelLimitMin >= 1440 ? "24 ore" : "2 ore"} prima` : "Solo al telefono",
  });
  return rows;
}

/** La zona per il percorso: «Porta Nuova · Torino» → «Porta Nuova». */
export const zoneOf = (area: string | null, city: string | null) => {
  const first = area?.split("·")[0]?.trim() || null;
  return first && first.toLowerCase() !== city?.toLowerCase() ? first : null;
};
