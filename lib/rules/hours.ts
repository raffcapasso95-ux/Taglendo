/** Orari in minuti dalla mezzanotte, come nel database (540 = 9:00). */

export type DayHours = {
  closed: boolean;
  openMin: number | null;
  closeMin: number | null;
  breakStartMin: number | null;
  breakEndMin: number | null;
};

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

/** Una riga per giorno della settimana, pronta per opening_hours. */
export function toWeek(input: HoursInput): DayHours[] {
  return Array.from({ length: 7 }, (_, weekday) => {
    if (!input.days.includes(weekday)) {
      return { closed: true, openMin: null, closeMin: null, breakStartMin: null, breakEndMin: null };
    }
    return {
      closed: false,
      openMin: input.openMin,
      closeMin: input.closeMin,
      breakStartMin: input.breakMin?.start ?? null,
      breakEndMin: input.breakMin?.end ?? null,
    };
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
  const text = (d: DayHours) =>
    d.closed || d.openMin == null || d.closeMin == null
      ? "Chiuso"
      : d.breakStartMin != null && d.breakEndMin != null
        ? `${formatMinutes(d.openMin)}–${formatMinutes(d.breakStartMin)} · ${formatMinutes(d.breakEndMin)}–${formatMinutes(d.closeMin)}`
        : `${formatMinutes(d.openMin)}–${formatMinutes(d.closeMin)}`;

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
