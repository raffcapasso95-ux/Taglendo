import { describe, expect, it } from "vitest";
import { swipeTarget } from "./swipe";

describe("swipeTarget", () => {
  it("verso sinistra è il giorno dopo, verso destra il giorno prima", () => {
    expect(swipeTarget(-120, 5, 250)).toBe(1);
    expect(swipeTarget(120, -5, 250)).toBe(-1);
  });
  it("un gesto corto non fa niente", () => {
    expect(swipeTarget(-60, 0, 200)).toBe(0);
    expect(swipeTarget(69, 0, 200)).toBe(0);
    expect(swipeTarget(70, 0, 200)).toBe(-1);
  });
  it("uno scorrimento in giù (più verticale che orizzontale) non cambia giorno", () => {
    expect(swipeTarget(-90, 200, 300)).toBe(0);
    expect(swipeTarget(-100, 60, 300)).toBe(1); // 100 ≥ 60 × 1,6
    expect(swipeTarget(-100, 70, 300)).toBe(0);
  });
  it("un gesto lento (dito appoggiato) non conta", () => {
    expect(swipeTarget(-200, 0, 701)).toBe(0);
    expect(swipeTarget(-200, 0, 700)).toBe(1);
  });
});
