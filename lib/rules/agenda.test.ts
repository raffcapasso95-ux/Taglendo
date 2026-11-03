import { describe, expect, it } from "vitest";
import {
  buildDay,
  busyPercent,
  freeIntervals,
  gridStart,
  initials,
  operatorStatus,
  span,
  type AgendaAppt,
  type DayHours,
} from "./agenda";

const HOURS: DayHours = { closed: false, openMin: 540, closeMin: 1140, breakStartMin: 780, breakEndMin: 870 };
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
    expect(freeIntervals({ ...HOURS, breakStartMin: null, breakEndMin: null }, [])).toEqual([[540, 1140]]);
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
      hours: { ...HOURS, breakStartMin: null, breakEndMin: null, closeMin: 600 },
      operators: [operators[0]!],
      appts: [appt("1", "a", 540, 600)],
    });
    expect(full.summary).toBe("1 cliente · Nessuno spazio libero");
  });
});
