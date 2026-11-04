import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("ics", () => {
  it("un evento in UTC, con righe CRLF e testi protetti", () => {
    const ics = buildIcs({
      uid: "TG-4829@taglendo",
      start: new Date("2026-10-30T09:30:00Z"),
      end: new Date("2026-10-30T10:20:00Z"),
      summary: "Taglio, barba; da Barberia Saragozza",
      location: "Via Saragozza 48, Bologna",
      now: new Date("2026-10-28T08:00:00Z"),
    });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261030T093000Z\r\n");
    expect(ics).toContain("DTEND:20261030T102000Z\r\n");
    expect(ics).toContain("DTSTAMP:20261028T080000Z\r\n");
    expect(ics).toContain("SUMMARY:Taglio\\, barba\; da Barberia Saragozza\r\n");
    expect(ics).toContain("LOCATION:Via Saragozza 48\\, Bologna\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("spezza le righe troppo lunghe", () => {
    const ics = buildIcs({ uid: "x", start: new Date(0), end: new Date(1000), summary: "a".repeat(200) });
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });
});
