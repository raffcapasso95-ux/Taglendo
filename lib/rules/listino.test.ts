import { describe, expect, it } from "vitest";
import { addRange, canSaveWeek, copyDay, outsideHours, removeRange, stepRange, weekSummary } from "./listino";
import type { Range, WeekDay } from "./hours";

const AM_PM: Range[] = [
  [540, 780],
  [870, 1140],
];
const open = (ranges: Range[]): WeekDay => ({ closed: false, ranges });
const closed: WeekDay = { closed: true, ranges: [] };
// domenica e lunedì chiusi, da martedì a sabato 9–13 e 14:30–19
const WEEK: WeekDay[] = [closed, closed, open(AM_PM), open(AM_PM), open(AM_PM), open(AM_PM), open(AM_PM)];

describe("stepRange", () => {
  it("le frecce vanno di 15 minuti", () => {
    expect(stepRange(AM_PM, 0, "to", 15)[0]).toEqual([540, 795]);
    expect(stepRange(AM_PM, 1, "from", -15)[1]).toEqual([855, 1140]);
  });

  it("una fascia non passa sulla vicina e dura almeno 30 minuti", () => {
    expect(stepRange(AM_PM, 0, "to", 1000)[0]).toEqual([540, 870]); // si ferma dove inizia la seconda
    expect(stepRange(AM_PM, 1, "from", -1000)[1]).toEqual([780, 1140]); // si ferma dove finisce la prima
    expect(stepRange(AM_PM, 0, "to", -1000)[0]).toEqual([540, 570]);
    expect(stepRange(AM_PM, 0, "from", 1000)[0]).toEqual([750, 780]);
  });

  it("non si apre prima delle 6:00 né si chiude dopo le 23:00", () => {
    expect(stepRange([[360, 600]], 0, "from", -30)[0]).toEqual([360, 600]);
    expect(stepRange([[600, 1380]], 0, "to", 30)[0]).toEqual([600, 1380]);
  });
});

describe("fasce", () => {
  it("aggiunge una fascia dopo l'ultima, fino a quattro, e la toglie", () => {
    const three = addRange(AM_PM)!;
    expect(three).toHaveLength(3);
    expect(three[2]![0]).toBeGreaterThan(1140);
    expect(addRange([[540, 600], [630, 700], [730, 800], [830, 900]])).toBeNull();
    expect(removeRange(AM_PM, 0)).toEqual([[870, 1140]]);
    expect(addRange([])).toEqual([[540, 780]]);
  });

  it("senza posto dopo le 22:30 non aggiunge niente", () => {
    expect(addRange([[540, 1380]])).toBeNull();
  });
});

describe("settimana", () => {
  it("almeno un giorno resta aperto", () => {
    expect(canSaveWeek(WEEK)).toBe(true);
    expect(canSaveWeek(WEEK.map(() => closed))).toBe(false);
    expect(canSaveWeek([open([])])).toBe(false);
  });

  it("copia le fasce di un giorno sugli altri e li apre", () => {
    const week = copyDay(WEEK, 2, [0, 1]);
    expect(week[0]).toEqual(open(AM_PM));
    expect(week[1]).toEqual(open(AM_PM));
    expect(week[2]).toBe(WEEK[2]);
  });

  it("riepilogo: giorni aperti, ore a settimana e orari di oggi", () => {
    // 4 h + 4 h 30 = 8,5 h per 5 giorni = 42,5 → 43
    expect(weekSummary(WEEK, 5)).toEqual({ main: "Aperto 5 giorni · 43 h a settimana", sub: "Oggi, venerdì: 9:00–13:00 · 14:30–19:00" });
    expect(weekSummary(WEEK, 0).sub).toBe("Oggi, domenica: chiuso");
    expect(weekSummary([open([[540, 600]]), ...WEEK.slice(1).map(() => closed)], 0).main).toBe("Aperto 1 giorno · 1 h a settimana");
  });
});

describe("outsideHours", () => {
  const appt = (weekday: number, startMin: number, endMin: number) => ({ weekday, startMin, endMin });

  it("conta giorno chiuso, fuori dalle fasce e dentro una pausa", () => {
    const newWeek: WeekDay[] = [closed, closed, open([[600, 780], [870, 1080]]), closed, closed, closed, closed];
    expect(outsideHours([appt(2, 660, 690)], newWeek)).toBe(0); // dentro
    expect(outsideHours([appt(3, 660, 690)], newWeek)).toBe(1); // mercoledì ora chiuso
    expect(outsideHours([appt(2, 570, 600)], newWeek)).toBe(1); // prima dell'apertura
    expect(outsideHours([appt(2, 1060, 1100)], newWeek)).toBe(1); // finisce dopo la chiusura
    expect(outsideHours([appt(2, 800, 830)], newWeek)).toBe(1); // in pausa
    expect(outsideHours([appt(2, 750, 780)], newWeek)).toBe(0); // finisce all'inizio della pausa
    expect(outsideHours([appt(2, 900, 930)], newWeek)).toBe(0); // seconda fascia
  });
});
