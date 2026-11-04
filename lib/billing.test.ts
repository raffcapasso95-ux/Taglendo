import { describe, expect, it } from "vitest";
import { hasActiveAccess, type AccessInput } from "./billing";

const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);
const salon = (sub_status: AccessInput["sub_status"], trial_ends_at = "2026-11-10T12:00:00Z"): AccessInput => ({
  sub_status,
  trial_ends_at,
});

describe("hasActiveAccess", () => {
  it("con i pagamenti spenti (beta gratuita) ogni salone ha accesso, anche a prova scaduta", () => {
    for (const status of ["trialing", "active", "past_due", "canceled", "expired"] as const) {
      expect(hasActiveAccess(salon(status, "2020-01-01T00:00:00Z"), false, NOW), status).toBe(true);
    }
  });

  it("con i pagamenti accesi la prova vale fino alla scadenza", () => {
    expect(hasActiveAccess(salon("trialing"), true, NOW)).toBe(true);
    expect(hasActiveAccess(salon("trialing", "2026-11-03T11:59:59Z"), true, NOW)).toBe(false);
    expect(hasActiveAccess(salon("trialing", "2026-11-03T12:00:00Z"), true, NOW)).toBe(false);
  });

  it("con i pagamenti accesi: attivo sì, disdetto o scaduto no", () => {
    expect(hasActiveAccess(salon("active", "2020-01-01T00:00:00Z"), true, NOW)).toBe(true);
    expect(hasActiveAccess(salon("canceled"), true, NOW)).toBe(false);
    expect(hasActiveAccess(salon("expired"), true, NOW)).toBe(false);
  });
});
