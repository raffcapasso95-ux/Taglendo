import { describe, expect, it } from "vitest";
import { isReminderHours, reminderDayWord, reminderDue, reminderLabel } from "./reminders";

const at = (iso: string) => new Date(iso);

describe("promemoria al cliente con anticipo a scelta", () => {
  const startsAt = at("2026-11-12T09:00:00Z");
  const createdAt = at("2026-11-01T10:00:00Z");

  it("con 24 ore parte da 24 ore prima fino all'inizio, non prima", () => {
    expect(reminderDue({ startsAt, createdAt, hours: 24, now: at("2026-11-11T08:00:00Z") })).toBe(false);
    expect(reminderDue({ startsAt, createdAt, hours: 24, now: at("2026-11-11T09:00:00Z") })).toBe(true);
    expect(reminderDue({ startsAt, createdAt, hours: 24, now: at("2026-11-12T08:00:00Z") })).toBe(true);
    expect(reminderDue({ startsAt, createdAt, hours: 24, now: at("2026-11-12T09:00:00Z") })).toBe(false);
  });

  it("con 2 ore parte lo stesso giorno, due ore prima", () => {
    expect(reminderDue({ startsAt, createdAt, hours: 2, now: at("2026-11-12T06:00:00Z") })).toBe(false);
    expect(reminderDue({ startsAt, createdAt, hours: 2, now: at("2026-11-12T07:00:00Z") })).toBe(true);
  });

  it("non parte se si è prenotato quando mancava meno dell'anticipo (c'è già la conferma)", () => {
    const late = at("2026-11-11T20:00:00Z"); // 13 ore prima
    expect(reminderDue({ startsAt, createdAt: late, hours: 24, now: at("2026-11-11T21:00:00Z") })).toBe(false);
    expect(reminderDue({ startsAt, createdAt: late, hours: 12, now: at("2026-11-11T21:00:00Z") })).toBe(true);
  });

  it("accetta solo gli anticipi previsti", () => {
    expect([2, 4, 12, 24, 48].every(isReminderHours)).toBe(true);
    expect(isReminderHours(6)).toBe(false);
    expect(isReminderHours("24")).toBe(false);
    expect(reminderLabel(12)).toBe("12 ore");
  });

  it("dice se l'appuntamento è oggi, domani o un altro giorno", () => {
    expect(reminderDayWord("2026-11-10", "2026-11-10", "2026-11-11")).toBe("oggi");
    expect(reminderDayWord("2026-11-11", "2026-11-10", "2026-11-11")).toBe("domani");
    expect(reminderDayWord("2026-11-12", "2026-11-10", "2026-11-11")).toBe("altro");
  });
});
