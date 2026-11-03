/**
 * Regole pure dell'agenda: spazi liberi, riepilogo del giorno, stato delle poltrone.
 * Tutti gli orari sono minuti dalla mezzanotte di Roma (540 = 9:00), come nel database.
 * Logica e testi vengono da design/Taglendo App.dc.html.
 */

export type ApptStatus = "confermato" | "completato" | "annullato" | "non_presentato";
export type ApptSource = "manuale" | "online" | "in_negozio";

export type AgendaAppt = {
  id: string;
  memberId: string;
  clientName: string;
  /** Telefono, solo se chi guarda può vederlo. */
  phone: string | null;
  serviceName: string;
  priceCents: number;
  startMin: number;
  endMin: number;
  status: ApptStatus;
  source: ApptSource;
};

export type DayHours = {
  closed: boolean;
  openMin: number;
  closeMin: number;
  breakStartMin: number | null;
  breakEndMin: number | null;
};

export type Operator = { id: string; name: string; chairNo: number };

/** Occupa il tempo del barbiere: confermato o completato (come nel prototipo e in free_slots). */
export const isActive = (s: ApptStatus) => s === "confermato" || s === "completato";

/** Spazio minimo che vale la pena mostrare come "libero", in minuti. */
export const MIN_GAP = 15;
/** Pixel per minuto nella griglia desktop (96 px l'ora). */
export const GRID_PX_PER_MIN = 1.6;

const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const clock = fmt;

/** `20 min`, `1 h`, `1 h 30 min`: come `span` del prototipo. */
export function span(n: number): string {
  return n < 60 ? `${n} min` : `${Math.floor(n / 60)} h${n % 60 ? ` ${n % 60} min` : ""}`;
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const firstLetter = (w: string) => {
  const t = w.replace(/^[^\p{L}]+/u, "");
  return t ? (Array.from(t)[0] ?? "") : "";
};

/** Iniziali di un nome: "Luca Rossi" → "LR"; senza lettere "?". */
export function initials(name: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter((w) => /\p{L}/u.test(w));
  if (words.length === 0) return "?";
  const first = firstLetter(words[0]!);
  const last = words.length > 1 ? firstLetter(words[words.length - 1]!) : "";
  return (first + last).toUpperCase();
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

type Interval = [number, number];

function subtract(base: Interval[], cut: Interval): Interval[] {
  const out: Interval[] = [];
  for (const [a, b] of base) {
    if (cut[1] <= a || cut[0] >= b) out.push([a, b]);
    else {
      if (cut[0] > a) out.push([a, cut[0]]);
      if (cut[1] < b) out.push([cut[1], b]);
    }
  }
  return out;
}

/**
 * Gli spazi liberi di un barbiere: l'apertura meno la pausa e gli appuntamenti che occupano il tempo.
 * `from` taglia il passato (per oggi). Gli spazi più corti di `minGap` non si mostrano.
 */
export function freeIntervals(
  hours: DayHours,
  busy: Array<Pick<AgendaAppt, "startMin" | "endMin">>,
  from = 0,
  minGap = MIN_GAP,
): Interval[] {
  if (hours.closed) return [];
  let free: Interval[] = [[Math.max(hours.openMin, from), hours.closeMin]];
  free = free.filter(([a, b]) => b > a);
  if (hours.breakStartMin != null && hours.breakEndMin != null) {
    free = subtract(free, [hours.breakStartMin, hours.breakEndMin]);
  }
  for (const a of busy) free = subtract(free, [a.startMin, a.endMin]);
  return free.filter(([a, b]) => b - a >= minGap);
}

export type OperatorStatus = {
  kind: "busy" | "free";
  /** Frase sotto il nome, come nell'intestazione della colonna. */
  text: string;
};

/** Lo stato di una poltrona: "In poltrona: Marco fino alle 10:50" o "Libera · prossimo alle 10:30". */
export function operatorStatus(appts: AgendaAppt[], isToday: boolean, nowMin: number): OperatorStatus {
  const live = appts.filter((a) => a.status === "confermato").sort((a, b) => a.startMin - b.startMin);
  const current = isToday ? live.find((a) => a.startMin <= nowMin && nowMin < a.endMin) : undefined;
  if (current) {
    return { kind: "busy", text: `In poltrona: ${firstName(current.clientName)} fino alle ${fmt(current.endMin)}` };
  }
  const next = live.find((a) => (isToday ? a.startMin > nowMin : true));
  if (next) {
    return { kind: "free", text: `${isToday ? "Libera · prossimo alle " : "Primo cliente alle "}${fmt(next.startMin)}` };
  }
  return { kind: "free", text: isToday ? "Libera · nessun altro cliente" : "Nessun cliente" };
}

/** Quanto della giornata di lavoro è occupato, 0–100. */
export function busyPercent(hours: DayHours, appts: AgendaAppt[]): number {
  if (hours.closed) return 0;
  const work =
    hours.closeMin - hours.openMin - (hours.breakStartMin != null && hours.breakEndMin != null ? hours.breakEndMin - hours.breakStartMin : 0);
  if (work <= 0) return 0;
  const busy = appts.filter((a) => isActive(a.status)).reduce((sum, a) => sum + (a.endMin - a.startMin), 0);
  return Math.min(100, Math.round((busy / work) * 100));
}

/** Da dove parte la griglia: oggi, dopo la mezz'ora di apertura, si nasconde il passato (a meno di "Mostra"). */
export function gridStart(hours: DayHours, isToday: boolean, nowMin: number, showPast: boolean): number {
  return isToday && !showPast && nowMin > hours.openMin + 30
    ? Math.max(hours.openMin, Math.floor((nowMin - 30) / 30) * 30)
    : hours.openMin;
}

export type Column = {
  operator: Operator;
  /** Indice per il colore (0 prugna, 1 albicocca, 2 pesca, 3 grigio). */
  colorIndex: number;
  appts: AgendaAppt[];
  count: number;
  status: OperatorStatus;
  fill: number;
  gaps: Interval[];
};

export type FreeSpot = { memberId: string; name: string; colorIndex: number; start: number; end: number; now: boolean };

export type DayModel = {
  date: string;
  isToday: boolean;
  nowMin: number;
  hours: DayHours;
  closed: boolean;
  columns: Column[];
  /** Quanti clienti ci sono e quanto tempo libero resta, per tutti i barbieri mostrati. */
  clientCount: number;
  freeMinutes: number;
  summary: string;
  /** Primi spazi liberi da adesso, in ordine di orario. */
  freeNext: FreeSpot[];
  /** Appuntamenti passati (già finiti) di oggi. */
  pastCount: number;
  cancelledCount: number;
};

export type DayInput = {
  date: string;
  isToday: boolean;
  nowMin: number;
  hours: DayHours;
  operators: Operator[];
  appts: AgendaAppt[];
};

/** Costruisce tutto ciò che serve a disegnare un giorno. Gli operatori sono già filtrati. */
export function buildDay(input: DayInput): DayModel {
  const { date, isToday, nowMin, hours, operators, appts } = input;
  const from = isToday ? nowMin : 0;

  const columns: Column[] = operators.map((operator, i) => {
    const mine = appts.filter((a) => a.memberId === operator.id).sort((a, b) => a.startMin - b.startMin);
    const live = mine.filter((a) => isActive(a.status));
    return {
      operator,
      colorIndex: i % 4,
      appts: mine,
      count: live.length,
      status: operatorStatus(mine, isToday, nowMin),
      fill: busyPercent(hours, mine),
      gaps: freeIntervals(hours, live, from),
    };
  });

  const clientCount = columns.reduce((n, c) => n + c.count, 0);
  const freeMinutes = columns.reduce((n, c) => n + c.gaps.reduce((s, [a, b]) => s + (b - a), 0), 0);

  const closed = hours.closed;
  const summary = closed
    ? ""
    : `${plural(clientCount, "cliente", "clienti")} · ${freeMinutes > 0 ? `${span(freeMinutes)} libere` : "Nessuno spazio libero"}`;

  const freeNext: FreeSpot[] = columns
    .flatMap((c) =>
      c.gaps.map(([a, b]) => ({
        memberId: c.operator.id,
        name: c.operator.name,
        colorIndex: c.colorIndex,
        start: isToday ? Math.max(a, nowMin) : a,
        end: b,
        now: isToday && a <= nowMin,
      })),
    )
    .sort((x, y) => x.start - y.start || x.name.localeCompare(y.name))
    .slice(0, 3);

  const pastCount = isToday
    ? appts.filter((a) => a.status !== "annullato" && a.endMin <= nowMin).length
    : 0;

  return {
    date,
    isToday,
    nowMin,
    hours,
    closed,
    columns,
    clientCount,
    freeMinutes,
    summary,
    freeNext,
    pastCount,
    cancelledCount: appts.filter((a) => a.status === "annullato").length,
  };
}
