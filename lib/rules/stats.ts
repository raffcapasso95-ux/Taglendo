import { addMonths, monthTitle } from "@/lib/dates/calendar";
import { formatPrice } from "@/lib/dates/format";
import { addDays, dayNumber, longDay, monthShort, weekdayName, weekdayOf, weekdayShort } from "@/lib/dates/rome";

/** Statistiche: periodi, etichette, variazioni e andamento. Date come «2026-11-05», mesi «2026-11». */
export type Period = "giorno" | "settimana" | "mese" | "anno";
export const PERIODS: Period[] = ["giorno", "settimana", "mese", "anno"];
export const PERIOD_LABEL: Record<Period, string> = { giorno: "Giorno", settimana: "Settimana", mese: "Mese", anno: "Anno" };

export const isPeriod = (v: string | undefined | null): v is Period => PERIODS.includes(v as Period);

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Il primo giorno del periodo che contiene `date`: il giorno stesso, il lunedì, il primo del mese, il primo gennaio. */
export function periodStart(period: Period, date: string): string {
  if (period === "giorno") return date;
  if (period === "settimana") return addDays(date, -((weekdayOf(date) + 6) % 7));
  if (period === "mese") return `${date.slice(0, 7)}-01`;
  return `${date.slice(0, 4)}-01-01`;
}

/** Da quando (incluso) a quando (escluso) dura il periodo che comincia a `start`. */
export function periodEnd(period: Period, start: string): string {
  if (period === "giorno") return addDays(start, 1);
  if (period === "settimana") return addDays(start, 7);
  if (period === "mese") return `${addMonths(start.slice(0, 7), 1)}-01`;
  return `${Number(start.slice(0, 4)) + 1}-01-01`;
}

/** Il periodo prima (`-1`) o dopo (`1`). */
export function shiftPeriod(period: Period, start: string, n: 1 | -1): string {
  if (period === "giorno") return addDays(start, n);
  if (period === "settimana") return addDays(start, 7 * n);
  if (period === "mese") return `${addMonths(start.slice(0, 7), n)}-01`;
  return `${Number(start.slice(0, 4)) + n}-01-01`;
}

const short = (d: string) => `${dayNumber(d)} ${monthShort(d)}`;

/** Il titolo della scheda: «Giovedì 5 novembre», «27 ott – 2 nov», «Ottobre 2026», «2026». */
export function periodTitle(period: Period, start: string): string {
  if (period === "giorno") return longDay(start);
  if (period === "settimana") return `${short(start)} – ${short(addDays(start, 6))}`;
  if (period === "mese") return monthTitle(start.slice(0, 7));
  return start.slice(0, 4);
}

const PLURAL: Record<number, string> = { 0: "delle domeniche", 6: "dei sabati" };

/** «sulla media dei giovedì» */
export function dayAverageText(date: string): string {
  const wd = weekdayOf(date);
  return `sulla media ${PLURAL[wd] ?? `dei ${lowerFirst(weekdayName(date))}`}`;
}

/** Con cosa si confronta il periodo: «su settembre», «su settimana prima», «su 2025», «sulla media dei giovedì». */
export function comparedWith(period: Period, start: string): string {
  if (period === "giorno") return dayAverageText(start);
  if (period === "settimana") return "su settimana prima";
  if (period === "mese") return `su ${lowerFirst(monthTitle(addMonths(start.slice(0, 7), -1)).split(" ")[0]!)}`;
  return `su ${Number(start.slice(0, 4)) - 1}`;
}

export type Delta = { up: boolean; text: string };

/** Variazione percentuale; senza un periodo prima con incassi non c'è confronto. */
export function delta(current: number, before: number, suffix: string): Delta | null {
  if (before <= 0) return null;
  const pct = Math.round(((current - before) / before) * 100);
  return { up: pct >= 0, text: `${pct >= 0 ? "+" : "−"}${Math.abs(pct)}% ${suffix}` };
}

/** Lo scontrino medio, in centesimi. */
export const averageCents = (revenue: number, count: number): number => (count > 0 ? Math.round(revenue / count) : 0);

/** Quota (0–100) rispetto al valore più alto, con un decimale. */
export const share = (value: number, max: number): number => (max > 0 ? Math.round((value / max) * 1000) / 10 : 0);

/** Curva morbida dell'andamento in un riquadro 300 × 90: il valore più alto sta a 8,2. */
export function areaPath(values: number[]): { line: string; fill: string } {
  const pts = values.length === 1 ? [values[0]!, values[0]!] : values;
  const max = Math.max(...pts, 0);
  const x = (i: number) => (i * 300) / (pts.length - 1);
  const y = (v: number) => (max > 0 ? 90 - (81.8 * v) / max : 90);
  const f = (n: number) => n.toFixed(1);
  let line = `M${f(x(0))},${f(y(pts[0]!))}`;
  for (let i = 1; i < pts.length; i++) {
    const mid = (x(i - 1) + x(i)) / 2;
    line += ` C${f(mid)},${f(y(pts[i - 1]!))} ${f(mid)},${f(y(pts[i]!))} ${f(x(i))},${f(y(pts[i]!))}`;
  }
  return { line, fill: `${line} L300,90 L0,90 Z` };
}

export type Point = { key: string; revenue: number };

/** I punti dell'andamento: i giorni di apertura fino a oggi, o i mesi dell'anno fino a questo. */
export function seriesPoints(period: Exclude<Period, "giorno">, start: string, today: string, openWeekdays: boolean[], revenueOf: (key: string) => number): Point[] {
  const points: Point[] = [];
  if (period === "anno") {
    for (let m = 1; m <= 12; m++) {
      const key = `${start.slice(0, 4)}-${String(m).padStart(2, "0")}`;
      if (`${key}-01` > today) break;
      points.push({ key, revenue: revenueOf(key) });
    }
    return points;
  }
  const end = periodEnd(period, start);
  for (let d = start; d < end && d <= today; d = addDays(d, 1)) {
    if (openWeekdays[weekdayOf(d)]) points.push({ key: d, revenue: revenueOf(d) });
  }
  return points;
}

/** «Gio 1 ott» */
export const dayAxis = (d: string) => `${weekdayShort(d)} ${dayNumber(d)} ${monthShort(d)}`;

export type Best = { key: string; revenue: number };

export const bestPoint = (points: Point[]): Best | null => {
  let best: Best | null = null;
  for (const p of points) if (p.revenue > 0 && (!best || p.revenue > best.revenue)) best = p;
  return best;
};

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const euro = (cents: number) => formatPrice(cents);

export type ReportInput = {
  title: string;
  salon: string;
  revenue: number;
  count: number;
  discounts: number;
  operators: Array<{ name: string; revenue: number; count: number }>;
};

/** Il testo del resoconto del giorno da mandare su WhatsApp. */
export function reportText(r: ReportInput): string {
  const lines = [`Resoconto di ${r.title} · ${r.salon}`, `Incasso: ${euro(r.revenue)}`, `${plural(r.count, "cliente", "clienti")} · scontrino medio ${euro(averageCents(r.revenue, r.count))}`];
  if (r.discounts > 0) lines.push(`Sconti fatti: −${euro(r.discounts)}`);
  for (const o of r.operators) lines.push(`${o.name}: ${euro(o.revenue)} (${plural(o.count, "cliente", "clienti")})`);
  return lines.join("\n");
}
