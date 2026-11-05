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

export type Operator = {
  id: string;
  name: string;
  chairNo: number;
  /** In chiusura (ferie) in questo giorno: la colonna c'è ma non ha spazi liberi. */
  off?: boolean;
};

/** Occupa il tempo del barbiere: confermato o completato (come nel prototipo e in free_slots). */
export const isActive = (s: ApptStatus) => s === "confermato" || s === "completato";

/** Spazio minimo che vale la pena mostrare come "libero", in minuti. */
export const MIN_GAP = 15;
/** Pixel per minuto nella griglia desktop (96 px l'ora). */
export const GRID_PX_PER_MIN = 1.6;

/** Un tratto senza appuntamenti lungo almeno così (minuti) viene compresso nella griglia desktop. */
export const QUIET_MIN = 60;
/** Altezza (px) di un tratto compresso. */
export const QUIET_PX = 44;

export type GridBand = { from: number; to: number; top: number; height: number; compressed: boolean };
export type GridScale = {
  /** Da minuti dalla mezzanotte alla posizione verticale (px) nella griglia. */
  y: (min: number) => number;
  height: number;
  bands: GridBand[];
};

/**
 * Scala verticale della griglia desktop, uguale per tutte le colonne: gli appuntamenti restano proporzionali
 * al tempo (px per minuto), mentre i tratti in cui NESSUN barbiere ha appuntamenti e che durano almeno
 * `quietMin` minuti si riducono a una fascia bassa. Così una giornata intera sta in uno schermo.
 */
export function gridScale(
  busy: ReadonlyArray<readonly [number, number]>,
  start: number,
  end: number,
  px: number = GRID_PX_PER_MIN,
  quietMin: number = QUIET_MIN,
  quietPx: number = QUIET_PX,
  /** Pause del salone: si comprimono per conto loro e non si fondono con i tratti liberi accanto. */
  pauses: ReadonlyArray<readonly [number, number]> = [],
): GridScale {
  const clip = ([x, y]: readonly [number, number]): [number, number] => [Math.max(x, start), Math.min(y, end)];
  const inDay = (list: ReadonlyArray<readonly [number, number]>) => list.map(clip).filter(([x, y]) => y > x);

  const merged: Array<[number, number]> = [];
  for (const [a, b] of [...inDay(busy), ...inDay(pauses)].sort((p, q) => p[0] - q[0])) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  const free: Array<[number, number]> = [];
  let cursor = start;
  for (const [a, b] of merged) {
    if (a > cursor) free.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < end) free.push([cursor, end]);

  const compressed = [...free.filter(([a, b]) => b - a >= quietMin), ...inDay(pauses).filter(([a, b]) => b - a >= quietMin)].sort((p, q) => p[0] - q[0]);

  const bands: GridBand[] = [];
  let at = start;
  let top = 0;
  const push = (from: number, to: number, isCompressed: boolean) => {
    if (to <= from) return;
    const height = isCompressed ? quietPx : (to - from) * px;
    bands.push({ from, to, top, height, compressed: isCompressed });
    top += height;
  };
  for (const [a, b] of compressed) {
    push(at, a, false);
    push(a, b, true);
    at = b;
  }
  push(at, end, false);

  const y = (min: number) => {
    const m = Math.min(Math.max(min, start), end);
    const band = bands.find((x) => m <= x.to) ?? bands[bands.length - 1];
    if (!band) return 0;
    return band.top + ((m - band.from) / (band.to - band.from)) * band.height;
  };
  return { y, height: top, bands };
}

/** Altezze (px per minuto) provate, dalla più comoda alla più stretta, perché la giornata stia nello spazio. */
export const GRID_PX_STEPS = [1.6, 1.5, 1.4, 1.3, 1.2] as const;

/** La scala più comoda che sta in `available` px; se nemmeno la più stretta basta, quella (si scorre). */
export function fitGridScale(
  busy: ReadonlyArray<readonly [number, number]>,
  start: number,
  end: number,
  available: number | null,
  pauses: ReadonlyArray<readonly [number, number]> = [],
): GridScale {
  const make = (px: number) => gridScale(busy, start, end, px, QUIET_MIN, QUIET_PX, pauses);
  if (available === null) return make(GRID_PX_STEPS[0]);
  for (const px of GRID_PX_STEPS) {
    const sc = make(px);
    if (sc.height <= available) return sc;
  }
  return make(GRID_PX_STEPS[GRID_PX_STEPS.length - 1]!);
}

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

/**
 * Da dove a dove si disegna la griglia. Di solito dall'apertura alla chiusura, ma se un appuntamento
 * resta fuori orario (orari cambiati dopo, o giorno diventato chiuso) la griglia si allarga per mostrarlo.
 * `open` è l'inizio della giornata; `start` è dove parte davvero (oggi si nascondono le ore passate).
 */
export function gridRange(day: DayModel, showPast: boolean): { open: number; start: number; end: number } {
  const { hours, isToday, nowMin } = day;
  const relevant = day.columns
    .flatMap((c) => c.appts)
    .filter((a) => a.status !== "annullato" && !(isToday && !showPast && a.endMin <= nowMin));
  const down = (m: number) => Math.floor(m / 30) * 30;
  const up = (m: number) => Math.ceil(m / 30) * 30;

  let open = hours.closed ? (relevant.length ? down(Math.min(...relevant.map((a) => a.startMin))) : 540) : hours.openMin;
  let end = hours.closed ? (relevant.length ? up(Math.max(...relevant.map((a) => a.endMin))) : 1140) : hours.closeMin;
  for (const a of relevant) {
    open = Math.min(open, down(a.startMin));
    end = Math.max(end, up(a.endMin));
  }
  const start = gridStart({ ...hours, closed: false, openMin: open, closeMin: end }, isToday, nowMin, showPast);
  return { open, start, end };
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
      status: operator.off ? { kind: "free" as const, text: "Non lavora oggi" } : operatorStatus(mine, isToday, nowMin),
      fill: busyPercent(hours, mine),
      gaps: operator.off ? [] : freeIntervals(hours, live, from),
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


/** Un appuntamento con il barbiere a cui appartiene, per la barra laterale. */
export type SideAppt = AgendaAppt & { operatorName: string; colorIndex: number };

export type SideSummary = {
  /** In poltrona adesso (solo oggi). */
  live: SideAppt[];
  /** Finiti ma ancora «confermati»: vanno chiusi con Completato o Non presentato (solo oggi). */
  toClose: SideAppt[];
  /** I prossimi, in ordine di orario. */
  upcoming: SideAppt[];
  clientCount: number;
  /** Incasso previsto: appuntamenti confermati e completati (annullati e non presentati no). */
  revenueCents: number;
  /** Occupazione media dei barbieri mostrati, 0–100. */
  fill: number;
};

export const SIDE_UPCOMING = 5;

/** Cosa mostra la barra laterale dell'agenda: cosa chiudere, cosa viene dopo e i numeri della giornata. */
export function sideSummary(day: DayModel): SideSummary {
  const all: SideAppt[] = day.columns
    .flatMap((c) => c.appts.map((a) => ({ ...a, operatorName: c.operator.name, colorIndex: c.colorIndex })))
    .sort((a, b) => a.startMin - b.startMin || a.operatorName.localeCompare(b.operatorName));
  const confirmed = all.filter((a) => a.status === "confermato");
  const { isToday, nowMin } = day;
  const live = isToday ? confirmed.filter((a) => a.startMin <= nowMin && nowMin < a.endMin) : [];
  const toClose = isToday ? confirmed.filter((a) => a.endMin <= nowMin) : [];
  const upcoming = (isToday ? confirmed.filter((a) => a.startMin > nowMin) : confirmed).slice(0, SIDE_UPCOMING);
  const revenueCents = all.filter((a) => a.status === "confermato" || a.status === "completato").reduce((n, a) => n + a.priceCents, 0);
  const fill = day.columns.length ? Math.round(day.columns.reduce((n, c) => n + c.fill, 0) / day.columns.length) : 0;
  return { live, toClose, upcoming, clientCount: day.clientCount, revenueCents, fill };
}
