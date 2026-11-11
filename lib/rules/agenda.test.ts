import { describe, expect, it } from "vitest";
import {
  operatorColor,
  buildDay,
  busyPercent,
  freeIntervals,
  GRID_PX_MIN,
  GRID_PX_PER_MIN,
  gridRange,
  fillScale,
  fitGridScale,
  gridScale,
  gridStart,
  initials,
  operatorStatus,
  QUIET_PX,
  sideSummary,
  span,
  type AgendaAppt,
  type DayHours,
} from "./agenda";

const HOURS: DayHours = { closed: false, openMin: 540, closeMin: 1140, breaks: [[780, 870]] };
const appt = (id: string, memberId: string, startMin: number, endMin: number, extra: Partial<AgendaAppt> = {}): AgendaAppt => ({
  id,
  memberId,
  clientName: "Luca Rossi",
  phone: null,
  serviceName: "Taglio uomo",
  priceCents: 2000,
  startMin,
  endMin,
  status: "confermato",
  source: "manuale",
  ...extra,
});

describe("formati", () => {
  it("durate come nel prototipo", () => {
    expect(span(20)).toBe("20 min");
    expect(span(60)).toBe("1 h");
    expect(span(90)).toBe("1 h 30 min");
    expect(span(950)).toBe("15 h 50 min");
  });

  it("iniziali", () => {
    expect(initials("Luca Rossi")).toBe("LR");
    expect(initials("Jo")).toBe("J");
    expect(initials("Giovanni Battista Della Valle-Santangelo")).toBe("GV"); // prima e ultima parola
    expect(initials("Ragazzo con lo zaino rosso")).toBe("RR");
    expect(initials("Kevin 💈")).toBe("K");
    expect(initials("  ")).toBe("?");
    expect(initials("Ömer Şahin")).toBe("ÖŞ");
  });
});

describe("freeIntervals", () => {
  it("giorno vuoto: due spazi, mattina e pomeriggio, la pausa non c'è", () => {
    expect(freeIntervals(HOURS, [])).toEqual([
      [540, 780],
      [870, 1140],
    ]);
  });

  it("toglie gli appuntamenti e tiene gli spazi di almeno 15 minuti", () => {
    const busy = [appt("a", "m", 540, 600), appt("b", "m", 620, 770)];
    // 600–620 (20 min) resta; 770–780 (10 min) sparisce
    expect(freeIntervals(HOURS, busy)).toEqual([
      [600, 620],
      [870, 1140],
    ]);
  });

  it("per oggi taglia il passato", () => {
    expect(freeIntervals(HOURS, [], 605)).toEqual([
      [605, 780],
      [870, 1140],
    ]);
    expect(freeIntervals(HOURS, [], 1130)).toEqual([]); // restano 10 minuti
  });

  it("giorno chiuso: nessuno spazio", () => {
    expect(freeIntervals({ ...HOURS, closed: true }, [])).toEqual([]);
  });

  it("senza pausa", () => {
    expect(freeIntervals({ ...HOURS, breaks: [] }, [])).toEqual([[540, 1140]]);
  });
});

describe("stato della poltrona", () => {
  const a = [appt("1", "m", 600, 650, { clientName: "Marco Bianchi" }), appt("2", "m", 690, 720)];

  it("in poltrona: nome e fine", () => {
    expect(operatorStatus(a, true, 605)).toEqual({ kind: "busy", text: "In poltrona: Marco fino alle 10:50" });
  });

  it("libera con un prossimo cliente", () => {
    expect(operatorStatus(a, true, 660)).toEqual({ kind: "free", text: "Libera · prossimo alle 11:30" });
  });

  it("libera e finito per oggi", () => {
    expect(operatorStatus(a, true, 800)).toEqual({ kind: "free", text: "Libera · nessun altro cliente" });
  });

  it("per un altro giorno: primo cliente, oppure nessuno", () => {
    expect(operatorStatus(a, false, 0)).toEqual({ kind: "free", text: "Primo cliente alle 10:00" });
    expect(operatorStatus([], false, 0)).toEqual({ kind: "free", text: "Nessun cliente" });
  });

  it("gli annullati non contano", () => {
    expect(operatorStatus([appt("x", "m", 600, 650, { status: "annullato" })], true, 605).kind).toBe("free");
  });
});

describe("occupazione e griglia", () => {
  it("percentuale del tempo di lavoro occupato", () => {
    // 600 minuti di apertura meno 90 di pausa = 510
    expect(busyPercent(HOURS, [appt("a", "m", 540, 591)])).toBe(10);
    expect(busyPercent(HOURS, [appt("a", "m", 540, 600, { status: "annullato" })])).toBe(0);
    expect(busyPercent({ ...HOURS, closed: true }, [])).toBe(0);
  });

  it("la griglia di oggi nasconde il passato", () => {
    expect(gridStart(HOURS, true, 605, false)).toBe(570); // 10:05 → dalle 9:30
    expect(gridStart(HOURS, true, 605, true)).toBe(540); // "Mostra"
    expect(gridStart(HOURS, true, 560, false)).toBe(540); // appena aperto
    expect(gridStart(HOURS, false, 605, false)).toBe(540); // un altro giorno
  });
});

describe("buildDay", () => {
  const operators = [
    { id: "a", name: "Andrea", chairNo: 1 },
    { id: "m", name: "Marco", chairNo: 2 },
  ];
  const appts = [
    appt("1", "a", 540, 570, { status: "completato" }),
    appt("2", "a", 600, 650),
    appt("3", "m", 570, 590, { status: "completato" }),
    appt("4", "m", 630, 660),
    appt("5", "m", 1050, 1080, { status: "annullato" }),
  ];

  it("riepilogo, conteggi e primi posti liberi per oggi alle 10:05", () => {
    const day = buildDay({ date: "2026-10-29", isToday: true, nowMin: 605, hours: HOURS, operators, appts });
    expect(day.clientCount).toBe(4); // completati e confermati, non l'annullato
    expect(day.columns[0]!.count).toBe(2);
    expect(day.columns[0]!.status.text).toBe("In poltrona: Luca fino alle 10:50");
    expect(day.summary).toMatch(/^4 clienti · \d+ h( \d+ min)? libere$/);
    expect(day.freeNext.map((f) => [f.name, f.start, f.now])).toEqual([
      ["Marco", 605, true],
      ["Andrea", 650, false],
      ["Marco", 660, false],
    ]);
    expect(day.pastCount).toBe(2);
    expect(day.cancelledCount).toBe(1);
  });

  it("giorno chiuso: nessun riepilogo", () => {
    const day = buildDay({ date: "2026-11-01", isToday: false, nowMin: 0, hours: { ...HOURS, closed: true }, operators, appts: [] });
    expect(day.closed).toBe(true);
    expect(day.summary).toBe("");
    expect(day.freeNext).toEqual([]);
  });

  it("senza appuntamenti: un cliente al singolare e spazio tutto libero", () => {
    const one = buildDay({ date: "2026-11-05", isToday: false, nowMin: 0, hours: HOURS, operators: [operators[0]!], appts: [appt("1", "a", 540, 570)] });
    expect(one.summary).toBe(`1 cliente · ${span(510 - 30)} libere`);
    const none = buildDay({ date: "2026-11-05", isToday: false, nowMin: 0, hours: HOURS, operators, appts: [] });
    expect(none.summary).toBe("0 clienti · 17 h libere");
  });

  it("senza spazi: lo dice", () => {
    const full = buildDay({
      date: "2026-11-05",
      isToday: false,
      nowMin: 0,
      hours: { ...HOURS, breaks: [], closeMin: 600 },
      operators: [operators[0]!],
      appts: [appt("1", "a", 540, 600)],
    });
    expect(full.summary).toBe("1 cliente · Nessuno spazio libero");
  });
});

describe("barbiere in ferie", () => {
  it("la colonna c'è ma senza spazi liberi, e lo dice", () => {
    const day = buildDay({
      date: "2026-11-05",
      isToday: false,
      nowMin: 0,
      hours: HOURS,
      operators: [
        { id: "a", name: "Andrea", chairNo: 1 },
        { id: "m", name: "Marco", chairNo: 2, off: true },
      ],
      appts: [],
    });
    expect(day.columns[1]!.gaps).toEqual([]);
    expect(day.columns[1]!.status.text).toBe("Non lavora oggi");
    expect(day.columns[0]!.gaps.length).toBe(2);
    expect(day.freeNext.every((f) => f.memberId === "a")).toBe(true);
  });
});

describe("gridRange", () => {
  const operators = [{ id: "a", name: "Andrea", chairNo: 1 }];
  const day = (hours: DayHours, appts: AgendaAppt[], isToday = false, nowMin = 0) =>
    buildDay({ date: "2026-11-05", isToday, nowMin, hours, operators, appts });

  it("di solito dall'apertura alla chiusura", () => {
    expect(gridRange(day(HOURS, [appt("1", "a", 600, 630)]), false)).toEqual({ open: 540, start: 540, end: 1140 });
  });

  it("si allarga per un appuntamento fuori orario", () => {
    const r = gridRange(day(HOURS, [appt("1", "a", 510, 540), appt("2", "a", 1140, 1175)]), false);
    expect(r).toEqual({ open: 510, start: 510, end: 1200 }); // 19:35 si arrotonda alle 20:00
  });

  it("un giorno chiuso con appuntamenti li mostra; senza, una giornata normale", () => {
    const closed = { ...HOURS, closed: true };
    expect(gridRange(day(closed, [appt("1", "a", 600, 650)]), false)).toEqual({ open: 600, start: 600, end: 660 });
    expect(gridRange(day(closed, []), false)).toEqual({ open: 540, start: 540, end: 1140 });
  });

  it("oggi non si allarga per gli appuntamenti già passati", () => {
    const past = day(HOURS, [appt("1", "a", 500, 530)], true, 700);
    expect(gridRange(past, false).open).toBe(540);
    expect(gridRange(past, true).open).toBe(480); // con "Mostra" sì
  });
});

describe("gridScale: scala compressa della griglia desktop", () => {
  const PX = GRID_PX_PER_MIN;

  it("senza tratti liberi lunghi è la scala lineare di sempre", () => {
    const sc = gridScale([[540, 1140]], 540, 1140);
    expect(sc.height).toBeCloseTo(600 * PX);
    expect(sc.y(600)).toBeCloseTo(60 * PX);
    expect(sc.bands.every((b) => !b.compressed)).toBe(true);
  });

  it("un tratto libero di almeno un'ora, in cui nessuno ha appuntamenti, si comprime", () => {
    // 9:00–10:00 occupato, 10:00–13:00 libero (3 h), 13:00–14:00 occupato
    const sc = gridScale([[540, 600], [780, 840]], 540, 840);
    const quiet = sc.bands.filter((b) => b.compressed);
    expect(quiet).toEqual([expect.objectContaining({ from: 600, to: 780, height: QUIET_PX })]);
    expect(sc.height).toBeCloseTo(60 * PX + QUIET_PX + 60 * PX);
    expect(sc.y(780) - sc.y(600)).toBeCloseTo(QUIET_PX); // la fascia compressa è alta quanto serve
    expect(sc.y(840) - sc.y(780)).toBeCloseTo(60 * PX); // l'appuntamento dopo resta proporzionale
  });

  it("un tratto libero più corto di un'ora resta com'è", () => {
    const sc = gridScale([[540, 600], [650, 700]], 540, 700);
    expect(sc.bands.some((b) => b.compressed)).toBe(false);
  });

  it("gli appuntamenti di barbieri diversi si sommano: compresso solo dove nessuno lavora", () => {
    // Andrea 9:00–9:30 e 14:00–15:00; Marco 11:00–11:30 → tra 11:30 e 14:00 nessuno (150 min), tra 9:30 e 11:00 nessuno (90 min)
    const sc = gridScale([[540, 570], [840, 900], [660, 690]], 540, 900);
    expect(sc.bands.filter((b) => b.compressed).map((b) => [b.from, b.to])).toEqual([[570, 660], [690, 840]]);
  });

  it("anche i tratti all'inizio e alla fine della giornata si comprimono", () => {
    const sc = gridScale([[720, 780]], 540, 1140);
    expect(sc.bands.map((b) => b.compressed)).toEqual([true, false, true]);
  });

  it("la posizione è continua, crescente e dentro l'altezza totale", () => {
    const sc = gridScale([[540, 600], [780, 840]], 540, 1140);
    let last = -1;
    for (let m = 540; m <= 1140; m += 5) {
      const y = sc.y(m);
      expect(y).toBeGreaterThanOrEqual(last);
      expect(y).toBeLessThanOrEqual(sc.height + 0.001);
      last = y;
    }
    expect(sc.y(0)).toBe(0); // fuori dal giorno si ferma agli estremi
    expect(sc.y(2000)).toBeCloseTo(sc.height);
  });

  it("senza nulla da compattare, o con la giornata tutta libera, non si rompe", () => {
    expect(gridScale([], 540, 1140).bands).toHaveLength(1);
    expect(gridScale([], 540, 1140).height).toBeCloseTo(QUIET_PX);
  });
});

describe("gridScale con la pausa", () => {
  it("la pausa si comprime da sola e non si fonde con i tratti liberi accanto", () => {
    // 9:00–12:25 occupato, libero 12:25–13:00 (35 min), pausa 13:00–14:30, 14:30–15:30 occupato
    const sc = gridScale([[540, 745], [870, 930]], 540, 930, GRID_PX_PER_MIN, 60, QUIET_PX, [[780, 870]]);
    expect(sc.bands.filter((b) => b.compressed).map((b) => [b.from, b.to])).toEqual([[780, 870]]);
    expect(sc.y(780) - sc.y(745)).toBeCloseTo(35 * GRID_PX_PER_MIN); // il buco prima della pausa resta alto
  });
  it("una pausa breve (sotto l'ora) resta com'è", () => {
    const sc = gridScale([[540, 700]], 540, 900, GRID_PX_PER_MIN, 60, QUIET_PX, [[780, 810]]);
    expect(sc.bands.filter((b) => b.compressed).map((b) => [b.from, b.to])).toEqual([[700, 780], [810, 900]].filter(([a, b]) => b - a >= 60));
  });
});

describe("fillScale: con pochi appuntamenti la griglia riempie lo spazio", () => {
  it("i tratti liberi compressi si allargano e la griglia arriva in fondo", () => {
    const busy: Array<[number, number]> = [[885, 915]]; // un solo appuntamento, 14:45–15:15
    const sc = fitGridScale(busy, 720, 1140, 600, [[780, 870]]);
    expect(sc.height).toBeCloseTo(600, 0);
    // l'appuntamento resta proporzionato (al massimo una volta e mezza la scala comoda)
    expect(sc.y(915) - sc.y(885)).toBeLessThanOrEqual(30 * GRID_PX_PER_MIN * 1.5 + 0.5);
    // ordine delle ore rispettato
    expect(sc.y(780)).toBeLessThan(sc.y(870));
    expect(sc.y(870)).toBeLessThan(sc.y(885));
  });

  it("se lo spazio è enorme non gonfia la griglia oltre una volta e mezza", () => {
    const sc = gridScale([[600, 630]], 540, 660, GRID_PX_PER_MIN);
    const filled = fillScale(sc, 5000, GRID_PX_PER_MIN);
    expect(filled.height).toBeLessThanOrEqual(120 * GRID_PX_PER_MIN * 1.5 + 1);
  });
});

describe("fitGridScale: la giornata sta nello spazio", () => {
  const busy: Array<[number, number]> = [[540, 570], [600, 630], [660, 690], [720, 750], [870, 900], [930, 960], [990, 1020], [1050, 1080]];
  it("senza misura usa la scala più comoda", () => {
    expect(fitGridScale(busy, 540, 1140, null).height).toBeCloseTo(gridScale(busy, 540, 1140, GRID_PX_PER_MIN).height);
  });
  it("se lo spazio è poco sceglie una scala più stretta; se non basta nemmeno quella si scorre, con la scala comoda", () => {
    const comfy = gridScale(busy, 540, 1140, GRID_PX_PER_MIN).height;
    const fit = fitGridScale(busy, 540, 1140, comfy - 20);
    expect(fit.height).toBeLessThanOrEqual(comfy - 20);
    const tiny = fitGridScale(busy, 540, 1140, 10);
    expect(fit.height).toBeGreaterThanOrEqual(gridScale(busy, 540, 1140, GRID_PX_MIN).height - 0.5);
    expect(tiny.height).toBeCloseTo(comfy);
  });
});

describe("sideSummary: la barra laterale", () => {
  const hours: DayHours = { closed: false, openMin: 540, closeMin: 1140, breaks: [[780, 870]] };
  const appt = (id: string, memberId: string, start: number, end: number, status: AgendaAppt["status"], price = 2000): AgendaAppt => ({
    id, memberId, clientName: `Cliente ${id}`, phone: null, serviceName: "Taglio", priceCents: price, startMin: start, endMin: end, status, source: "manuale",
  });
  const ops = [{ id: "a", name: "Andrea", chairNo: 1 }, { id: "m", name: "Marco", chairNo: 2 }];
  const day = (nowMin: number, appts: AgendaAppt[], isToday = true) => buildDay({ date: "2026-11-05", isToday, nowMin, hours, operators: ops, appts });

  it("oggi separa chi è in poltrona, chi è finito e va chiuso, e i prossimi", () => {
    const d = day(620, [
      appt("1", "a", 540, 570, "confermato"), // finito, da chiudere
      appt("2", "a", 600, 630, "confermato"), // in poltrona
      appt("3", "m", 660, 690, "confermato"), // prossimo
      appt("4", "m", 540, 570, "completato"), // già chiuso: non compare tra i da chiudere
    ]);
    const s = sideSummary(d);
    expect(s.toClose.map((a) => a.id)).toEqual(["1"]);
    expect(s.live.map((a) => a.id)).toEqual(["2"]);
    expect(s.upcoming.map((a) => a.id)).toEqual(["3"]);
    expect(s.live[0]!.operatorName).toBe("Andrea");
  });

  it("l'incasso previsto conta confermati e completati, non annullati né non presentati", () => {
    const s = sideSummary(day(500, [appt("1", "a", 540, 570, "confermato", 2000), appt("2", "a", 600, 630, "completato", 3000), appt("3", "m", 540, 570, "annullato", 5000), appt("4", "m", 600, 630, "non_presentato", 7000)]));
    expect(s.revenueCents).toBe(5000);
  });

  it("un altro giorno: niente in poltrona né da chiudere, i primi appuntamenti in ordine, al massimo 5", () => {
    const many = Array.from({ length: 8 }, (_, i) => appt(String(i), "a", 540 + i * 30, 570 + i * 30, "confermato"));
    const s = sideSummary(day(0, many, false));
    expect(s.live).toEqual([]);
    expect(s.toClose).toEqual([]);
    expect(s.upcoming.map((a) => a.id)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("giorno vuoto: tutto a zero", () => {
    const s = sideSummary(day(500, []));
    expect(s).toMatchObject({ live: [], toClose: [], upcoming: [], revenueCents: 0, fill: 0 });
  });
});

describe("colore dell'operatore in agenda", () => {
  it("vale quello scelto; senza scelta dipende dall'ordine delle poltrone", () => {
    expect(operatorColor({ color: 2 }, 0)).toBe(2);
    expect(operatorColor({ color: 0 }, 3)).toBe(0);
    expect(operatorColor({ color: null }, 5)).toBe(1);
    expect(operatorColor({}, 2)).toBe(2);
  });
});
