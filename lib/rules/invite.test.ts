import { describe, expect, it } from "vitest";
import { INVITE_DAYS, inviteExpiry, inviteStatus } from "./invite";

const NOW = Date.UTC(2026, 10, 2, 12, 0, 0);

describe("inviti", () => {
  it("valgono 7 giorni", () => {
    expect(INVITE_DAYS).toBe(7);
    expect(inviteExpiry(NOW)).toBe("2026-11-09T12:00:00.000Z");
  });

  it("senza scadenza non c'è invito", () => {
    expect(inviteStatus(null, NOW)).toBe("none");
  });

  it("valido fino all'ultimo istante, poi scaduto", () => {
    expect(inviteStatus("2026-11-09T12:00:00.000Z", NOW)).toBe("valid");
    expect(inviteStatus("2026-11-02T12:00:00.001Z", NOW)).toBe("valid");
    expect(inviteStatus("2026-11-02T12:00:00.000Z", NOW)).toBe("expired"); // allo scadere non vale più
    expect(inviteStatus("2026-11-01T12:00:00.000Z", NOW)).toBe("expired");
  });
});
