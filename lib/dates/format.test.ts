import { describe, expect, it } from "vitest";
import { formatDay, formatDayMonth, formatPrice, formatTime } from "./format";

describe("formati italiani", () => {
  it("giorno breve in Europe/Rome", () => {
    expect(formatDay(new Date("2026-10-30T10:00:00Z"))).toBe("Ven 30 ottobre");
    // 23:30 UTC del 31 ottobre è già domenica 1 novembre a Roma
    expect(formatDay(new Date("2026-10-31T23:30:00Z"))).toBe("Dom 1 novembre");
  });

  it("orario nel fuso di Roma, anche dopo il cambio d'ora", () => {
    expect(formatTime(new Date("2026-10-24T07:00:00Z"))).toBe("09:00"); // ora legale
    expect(formatTime(new Date("2026-10-26T08:00:00Z"))).toBe("09:00"); // ora solare
  });

  it("prezzi in centesimi", () => {
    expect(formatPrice(2000)).toBe("20 €");
    expect(formatPrice(990)).toBe("9,90 €");
  });

  it("giorno e mese, nel fuso di Roma", () => {
    expect(formatDayMonth(new Date("2026-11-13T10:00:00Z"))).toBe("13 novembre");
    expect(formatDayMonth(new Date("2026-11-12T23:30:00Z"))).toBe("13 novembre"); // mezzanotte passata a Roma
  });
});
