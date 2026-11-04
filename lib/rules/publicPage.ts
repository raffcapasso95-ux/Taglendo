import { formatMinutes, type DayHours } from "./hours";

const DAY_NAMES = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

/** 540 → "9", 570 → "9:30" (come nelle righe brevi del design: "Mar–Sab · 9–19"). */
export const shortTime = (min: number) => (min % 60 === 0 ? String(min / 60) : formatMinutes(min));

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
    const h = week[d]!;
    const time =
      h.closed || h.openMin == null || h.closeMin == null
        ? "Chiuso"
        : h.breakStartMin != null && h.breakEndMin != null
          ? `${formatMinutes(h.openMin)}–${formatMinutes(h.breakStartMin)} · ${formatMinutes(h.breakEndMin)}–${formatMinutes(h.closeMin)}`
          : `${formatMinutes(h.openMin)}–${formatMinutes(h.closeMin)}`;
    return { day: DAY_NAMES[d]!, time, today: d === todayWeekday };
  });
}

/** Una riga sola con gli orari del giorno tipo: "Mar–Sab · 9–13 e 14:30–19". */
export function typicalHoursLine(week: DayHours[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const text = (d: DayHours) =>
    d.closed || d.openMin == null || d.closeMin == null
      ? ""
      : d.breakStartMin != null && d.breakEndMin != null
        ? `${shortTime(d.openMin)}–${shortTime(d.breakStartMin)} e ${shortTime(d.breakEndMin)}–${shortTime(d.closeMin)}`
        : `${shortTime(d.openMin)}–${shortTime(d.closeMin)}`;
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
    const inBreak = today.breakStartMin != null && today.breakEndMin != null && nowMin >= today.breakStartMin && nowMin < today.breakEndMin;
    if (inBreak) return { open: false, title: "Pausa", line: `riapriamo alle ${formatMinutes(today.breakEndMin!)}` };
    if (nowMin >= today.openMin! && nowMin < today.closeMin!) {
      const next = today.breakStartMin != null && nowMin < today.breakStartMin ? today.breakStartMin : today.closeMin!;
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
