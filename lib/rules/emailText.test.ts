import { describe, expect, it } from "vitest";
import { romeWallToUtc } from "@/lib/dates/rome";
import { cancelLimitText, whenLong, whenShort } from "./emailText";

describe("testi delle email", () => {
  it("quando, in lungo e in breve", () => {
    expect(whenLong("2026-10-30", 10 * 60 + 30)).toBe("venerdì 30 ottobre alle 10:30");
    expect(whenShort("2026-10-30", 10 * 60 + 30)).toBe("Ven 30 ottobre, 10:30");
  });
  it("limite di annullamento: 2 ore prima, anche il giorno prima se serve", () => {
    const start = romeWallToUtc("2026-10-30", 10 * 60 + 30);
    expect(cancelLimitText(start, 120)).toBe("venerdì alle 8:30");
    expect(cancelLimitText(start, 1440)).toBe("giovedì alle 10:30");
    expect(cancelLimitText(romeWallToUtc("2026-10-30", 9 * 60), 120)).toBe("venerdì alle 7:00");
  });
});
