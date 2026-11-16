import { describe, expect, it } from "vitest";
import { hasActiveAccess, salonLock, trialWarning, type AccessInput } from "./billing";

const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);
const salon = (sub_status: AccessInput["sub_status"], trial_ends_at = "2026-12-03T12:00:00Z", suspended_at: string | null = null): AccessInput => ({
  sub_status,
  trial_ends_at,
  suspended_at,
});

describe("salonLock / hasActiveAccess", () => {
  it("la prova vale fino alla scadenza, con i pagamenti accesi o spenti", () => {
    expect(salonLock(salon("trialing"), NOW)).toBeNull();
    expect(salonLock(salon("trialing", "2026-11-03T11:59:59Z"), NOW)).toBe("trial_ended");
    expect(salonLock(salon("trialing", "2026-11-03T12:00:00Z"), NOW)).toBe("trial_ended");
    expect(hasActiveAccess(salon("trialing", "2020-01-01T00:00:00Z"), NOW)).toBe(false);
  });

  it("attivo sì (anche a prova scaduta), disdetto o scaduto no", () => {
    expect(salonLock(salon("active", "2020-01-01T00:00:00Z"), NOW)).toBeNull();
    expect(salonLock(salon("past_due", "2020-01-01T00:00:00Z"), NOW)).toBeNull();
    expect(salonLock(salon("canceled"), NOW)).toBe("trial_ended");
    expect(salonLock(salon("expired"), NOW)).toBe("trial_ended");
  });

  it("un salone sospeso da Taglendo è bloccato anche a prova in corso", () => {
    expect(salonLock(salon("trialing", undefined, "2026-11-01T00:00:00Z"), NOW)).toBe("suspended");
    expect(salonLock(salon("active", undefined, "2026-11-01T00:00:00Z"), NOW)).toBe("suspended");
  });
});

describe("trialWarning", () => {
  it("da 7 giorni prima della scadenza torna i giorni che mancano", () => {
    expect(trialWarning(salon("trialing", "2026-12-03T12:00:00Z"), NOW)).toBeNull(); // 30 giorni
    expect(trialWarning(salon("trialing", "2026-11-11T12:00:00Z"), NOW)).toBeNull(); // 8 giorni
    expect(trialWarning(salon("trialing", "2026-11-10T12:00:00Z"), NOW)).toBe(7);
    expect(trialWarning(salon("trialing", "2026-11-04T12:00:00Z"), NOW)).toBe(1);
    expect(trialWarning(salon("trialing", "2026-11-03T18:00:00Z"), NOW)).toBe(0); // oggi, più tardi
  });

  it("niente avviso a prova finita, con l'abbonamento o da sospesi", () => {
    expect(trialWarning(salon("trialing", "2026-11-03T11:00:00Z"), NOW)).toBeNull();
    expect(trialWarning(salon("active", "2026-11-05T12:00:00Z"), NOW)).toBeNull();
    expect(trialWarning(salon("trialing", "2026-11-05T12:00:00Z", "2026-11-01T00:00:00Z"), NOW)).toBeNull();
  });
});
