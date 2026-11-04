import { describe, expect, it } from "vitest";
import {
  addDays,
  dayRange,
  isValidDate,
  longDay,
  romeDate,
  romeMinutes,
  romeOffsetMinutes,
  romeWallToUtc,
  weekdayOf,
} from "./rome";

const iso = (d: Date) => d.toISOString();

describe("fuso di Roma", () => {
  it("anticipo: 60 minuti d'inverno, 120 d'estate", () => {
    expect(romeOffsetMinutes(new Date("2026-12-01T12:00:00Z"))).toBe(60);
    expect(romeOffsetMinutes(new Date("2026-07-01T12:00:00Z"))).toBe(120);
  });

  it("dagli orari di Roma agli istanti UTC", () => {
    expect(iso(romeWallToUtc("2026-11-05", 9 * 60))).toBe("2026-11-05T08:00:00.000Z");
    expect(iso(romeWallToUtc("2026-07-05", 9 * 60))).toBe("2026-07-05T07:00:00.000Z");
  });

  it("e ritorno: giorno e minuti di Roma", () => {
    const at = new Date("2026-11-05T23:30:00Z"); // già il 6 a Roma
    expect(romeDate(at)).toBe("2026-11-06");
    expect(romeMinutes(at)).toBe(30);
  });

  it("giorno dell'ora legale (28 marzo 2027): dura 23 ore", () => {
    const { start, end } = dayRange("2027-03-28");
    expect(iso(start)).toBe("2027-03-27T23:00:00.000Z");
    expect(iso(end)).toBe("2027-03-28T22:00:00.000Z");
    expect((end.getTime() - start.getTime()) / 3600000).toBe(23);
    expect(iso(romeWallToUtc("2027-03-28", 9 * 60))).toBe("2027-03-28T07:00:00.000Z");
  });

  it("giorno dell'ora solare (31 ottobre 2027): dura 25 ore", () => {
    const { start, end } = dayRange("2027-10-31");
    expect(iso(start)).toBe("2027-10-30T22:00:00.000Z");
    expect(iso(end)).toBe("2027-10-31T23:00:00.000Z");
    expect((end.getTime() - start.getTime()) / 3600000).toBe(25);
    expect(iso(romeWallToUtc("2027-10-31", 9 * 60))).toBe("2027-10-31T08:00:00.000Z");
  });

  it("un giorno normale dura 24 ore", () => {
    const { start, end } = dayRange("2026-11-05");
    expect((end.getTime() - start.getTime()) / 3600000).toBe(24);
  });
});

describe("date", () => {
  it("somma giorni attraverso mesi, anni e cambi d'ora", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-27", 1)).toBe("2027-03-28");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("giorno della settimana", () => {
    expect(weekdayOf("2026-10-29")).toBe(4); // giovedì
    expect(weekdayOf("2026-11-01")).toBe(0); // domenica
  });

  it("riconosce le date valide", () => {
    expect(isValidDate("2026-11-05")).toBe(true);
    for (const bad of ["2026-02-30", "2026-13-01", "5/11/2026", "", null, undefined, "2026-1-5"]) {
      expect(isValidDate(bad as string | null), String(bad)).toBe(false);
    }
  });

  it("formato italiano", () => {
    expect(longDay("2026-10-29")).toBe("Giovedì 29 ottobre");
    expect(longDay("2026-11-01")).toBe("Domenica 1 novembre");
  });
});
