import { describe, expect, it } from "vitest";
import { agoText, isDeleteConfirmed } from "./profile";

describe("conferma di eliminazione (C9)", () => {
  it("serve scrivere ELIMINA", () => {
    expect(isDeleteConfirmed("ELIMINA")).toBe(true);
    expect(isDeleteConfirmed("  elimina ")).toBe(true);
    expect(isDeleteConfirmed("ELIM")).toBe(false);
    expect(isDeleteConfirmed("")).toBe(false);
    expect(isDeleteConfirmed("ELIMINAA")).toBe(false);
  });
});

describe("agoText", () => {
  const now = new Date("2026-11-07T10:00:00Z");
  const ago = (d: number) => agoText(new Date(now.getTime() - d * 86_400_000), now);
  it("dice da quanto", () => {
    expect(ago(0)).toBe("oggi");
    expect(ago(1)).toBe("ieri");
    expect(ago(12)).toBe("12 giorni fa");
    expect(ago(35)).toBe("1 mese fa");
    expect(ago(95)).toBe("3 mesi fa");
    expect(ago(800)).toBe("2 anni fa");
  });
});
