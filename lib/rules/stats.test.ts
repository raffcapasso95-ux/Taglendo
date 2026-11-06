import { describe, expect, it } from "vitest";
import { areaPath, averageCents, bestPoint, comparedWith, delta, periodEnd, periodStart, periodTitle, reportText, seriesPoints, shiftPeriod, share } from "./stats";

describe("periodi delle statistiche", () => {
  it("inizio e fine di giorno, settimana (lunedì), mese e anno", () => {
    expect(periodStart("settimana", "2026-11-05")).toBe("2026-11-02");
    expect(periodStart("settimana", "2026-11-08")).toBe("2026-11-02"); // domenica
    expect(periodEnd("settimana", "2026-11-02")).toBe("2026-11-09");
    expect(periodStart("mese", "2026-10-17")).toBe("2026-10-01");
    expect(periodEnd("mese", "2026-12-01")).toBe("2027-01-01");
    expect(periodStart("anno", "2026-07-04")).toBe("2026-01-01");
    expect(periodEnd("giorno", "2026-11-05")).toBe("2026-11-06");
  });
  it("si sposta di un periodo", () => {
    expect(shiftPeriod("mese", "2026-01-01", -1)).toBe("2025-12-01");
    expect(shiftPeriod("settimana", "2026-11-02", 1)).toBe("2026-11-09");
    expect(shiftPeriod("anno", "2026-01-01", -1)).toBe("2025-01-01");
  });
  it("titoli e confronti come nel design", () => {
    expect(periodTitle("giorno", "2026-11-05")).toBe("Giovedì 5 novembre");
    expect(periodTitle("settimana", "2026-10-26")).toBe("26 ott – 1 nov");
    expect(periodTitle("mese", "2026-10-01")).toBe("Ottobre 2026");
    expect(comparedWith("mese", "2026-10-01")).toBe("su settembre");
    expect(comparedWith("anno", "2026-01-01")).toBe("su 2025");
    expect(comparedWith("giorno", "2026-11-05")).toBe("sulla media dei giovedì");
    expect(comparedWith("giorno", "2026-11-07")).toBe("sulla media dei sabati");
    expect(comparedWith("giorno", "2026-11-08")).toBe("sulla media delle domeniche");
  });
});

describe("numeri delle statistiche", () => {
  it("variazione: senza periodo prima non c'è confronto", () => {
    expect(delta(108, 100, "su settembre")).toEqual({ up: true, text: "+8% su settembre" });
    expect(delta(97, 100, "su settimana prima")).toEqual({ up: false, text: "−3% su settimana prima" });
    expect(delta(50, 0, "x")).toBeNull();
  });
  it("scontrino medio e quote", () => {
    expect(averageCents(24700, 12)).toBe(2058);
    expect(averageCents(0, 0)).toBe(0);
    expect(share(8700, 10000)).toBe(87);
    expect(share(1, 0)).toBe(0);
  });
  it("andamento: il valore più alto sta in alto, la curva chiude sul fondo", () => {
    const { line, fill } = areaPath([50, 100]);
    expect(line).toBe("M0.0,49.1 C150.0,49.1 150.0,8.2 300.0,8.2");
    expect(fill.endsWith("L300,90 L0,90 Z")).toBe(true);
    expect(areaPath([30]).line.startsWith("M0.0,8.2")).toBe(true);
  });
  it("punti: solo giorni di apertura fino a oggi, mesi fino a questo", () => {
    const open = [false, false, true, true, true, true, true]; // chiuso domenica e lunedì
    const pts = seriesPoints("settimana", "2026-11-02", "2026-11-05", open, (k) => (k === "2026-11-04" ? 90 : 0));
    expect(pts.map((p) => p.key)).toEqual(["2026-11-03", "2026-11-04", "2026-11-05"]);
    expect(bestPoint(pts)).toEqual({ key: "2026-11-04", revenue: 90 });
    expect(seriesPoints("anno", "2026-01-01", "2026-03-10", open, () => 1).map((p) => p.key)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(bestPoint([{ key: "a", revenue: 0 }])).toBeNull();
  });
  it("testo del resoconto per WhatsApp", () => {
    const text = reportText({ title: "Giovedì 5 novembre", salon: "Barberia", revenue: 24700, count: 12, discounts: 800, operators: [{ name: "Andrea", revenue: 8800, count: 4 }] });
    expect(text).toContain("Incasso: 247");
    expect(text).toContain("Sconti fatti: −8");
    expect(text).toContain("Andrea: 88");
  });
});
