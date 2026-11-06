/** Orari in minuti dalla mezzanotte, come nel database (540 = 9:00). */

/** Una fascia: [dalle, alle]. */
export type Range = [number, number];

/** Un giorno come lo si modifica e si salva: interruttore aperto/chiuso e le sue fasce. */
export type WeekDay = { closed: boolean; ranges: Range[] };

/**
 * Un giorno come lo usano agenda e prenotazioni: da quando a quando è aperto e dove sono le pause
 * (lo spazio fra una fascia e la successiva). Chiuso = senza orari.
 */
export type DayHours = {
  closed: boolean;
  openMin: number | null;
  closeMin: number | null;
  breaks: Range[];
};

export const CLOSED_DAY: DayHours = { closed: true, openMin: null, closeMin: null, breaks: [] };

/** Dalle fasce al giorno: apre alla prima, chiude all'ultima, le pause sono i vuoti in mezzo. Senza fasce il giorno è chiuso. */
export function dayFromRanges(week: WeekDay): DayHours {
  const ranges = [...week.ranges].sort((a, b) => a[0] - b[0]);
  if (week.closed || ranges.length === 0) return CLOSED_DAY;
  const breaks: Range[] = [];
  for (let i = 1; i < ranges.length; i++) if (ranges[i]![0] > ranges[i - 1]![1]) breaks.push([ranges[i - 1]![1], ranges[i]![0]]);
  return { closed: false, openMin: ranges[0]![0], closeMin: ranges[ranges.length - 1]![1], breaks };
}

/** Le fasce di un giorno aperto, ricavate da apertura, chiusura e pause. */
export function rangesOf(day: DayHours): Range[] {
  if (day.closed || day.openMin == null || day.closeMin == null) return [];
  const out: Range[] = [];
  let from = day.openMin;
  for (const [a, b] of day.breaks) {
    if (a > from) out.push([from, a]);
    from = b;
  }
  if (day.closeMin > from) out.push([from, day.closeMin]);
  return out;
}

/** «9:00–13:00 · 14:30–19:00», oppure «Chiuso». */
export function rangesText(day: DayHours): string {
  const ranges = rangesOf(day);
  return ranges.length === 0 ? "Chiuso" : ranges.map(([a, b]) => `${formatMinutes(a)}–${formatMinutes(b)}`).join(" · ");
}

/** Fasce al massimo per giorno: oltre non c'è un bisogno vero. */
export const MAX_RANGES = 4;

export type RangesError = "empty" | "order" | "overlap" | "too_many";

/** Controlla le fasce di un giorno aperto: almeno una, ognuna con inizio prima della fine, senza sovrapposizioni. */
export function validateRanges(ranges: Range[]): RangesError | null {
  if (ranges.length === 0) return "empty";
  if (ranges.length > MAX_RANGES) return "too_many";
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  for (const [a, b] of sorted) if (a >= b || a < 0 || b > 1440) return "order";
  for (let i = 1; i < sorted.length; i++) if (sorted[i]![0] < sorted[i - 1]![1]) return "overlap";
  return null;
}

export type HoursInput = {
  /** Giorni di apertura, 0 = domenica … 6 = sabato. */
  days: number[];
  openMin: number;
  closeMin: number;
  /** Pausa pranzo; null = nessuna pausa. */
  breakMin: { start: number; end: number } | null;
};

export type HoursError = "open_after_close" | "break_invalid" | "break_outside" | "no_days";

/** "9:00" o "09:00" → 540. Null se non è un orario valido. */
export function parseTime(text: string): number | null {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(text);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

/** 540 → "9:00" (senza zero davanti, come nei design). */
export function formatMinutes(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function validateHours(input: HoursInput): HoursError | null {
  if (input.days.length === 0) return "no_days";
  if (input.openMin >= input.closeMin) return "open_after_close";
  if (input.breakMin) {
    const { start, end } = input.breakMin;
    if (start >= end) return "break_invalid";
    if (start < input.openMin || end > input.closeMin) return "break_outside";
  }
  return null;
}

/** Una riga per giorno della settimana, pronta da salvare (da «giorni + orario unico + pausa» del primo avvio). */
export function toWeek(input: HoursInput): WeekDay[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    if (!input.days.includes(weekday)) return { closed: true, ranges: [] };
    const ranges: Range[] = input.breakMin
      ? [
          [input.openMin, input.breakMin.start],
          [input.breakMin.end, input.closeMin],
        ]
      : [[input.openMin, input.closeMin]];
    return { closed: false, ranges: ranges.filter(([a, b]) => b > a) };
  });
}

const DAY_NAMES = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export type HoursSummaryRow = { label: string; value: string };

/**
 * Riassunto per l'anteprima ("Lunedì Chiuso · Mar – Sab 9:00–13:00 · 14:30–19:00").
 * Raggruppa i giorni consecutivi con lo stesso orario, partendo dal lunedì.
 */
export function summarizeWeek(week: DayHours[]): HoursSummaryRow[] {
  const order = [1, 2, 3, 4, 5, 6, 0]; // da lunedì a domenica
  const text = rangesText;

  const rows: Array<{ days: number[]; value: string }> = [];
  for (const day of order) {
    const value = text(week[day]!);
    const last = rows[rows.length - 1];
    if (last && last.value === value) last.days.push(day);
    else rows.push({ days: [day], value });
  }
  return rows.map(({ days, value }) => ({
    label:
      days.length === 1
        ? DAY_NAMES[days[0]!]!
        : `${DAY_SHORT[days[0]!]} – ${DAY_SHORT[days[days.length - 1]!]}`,
    value,
  }));
}
