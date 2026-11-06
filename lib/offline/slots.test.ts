import { describe, expect, it } from "vitest";
import type { DayHours } from "@/lib/rules/agenda";
import { offlineSlots, type OfflineDay } from "./slots";

const hours: DayHours = { closed: false, openMin: 540, closeMin: 1140, breaks: [[780, 870]] };
const day: OfflineDay = {
  date: "2026-11-05",
  hours,
  columns: [
    { memberId: "a", gaps: [[540, 600], [660, 780], [870, 1140]] },
    { memberId: "b", gaps: [[540, 1140]] },
  ],
};
const free = (memberId: string | null, dur = 30, from = 0) => offlineSlots(day, dur, memberId, from).filter((s) => s.free).map((s) => s.startMin);

describe("orari liberi senza rete", () => {
  it("un barbiere: solo dove c'è posto per tutto il servizio", () => {
    const slots = free("a");
    expect(slots).toContain(540);
    expect(slots).toContain(570); // finisce alle 10:00, dentro il primo spazio
    expect(slots).not.toContain(585); // finirebbe alle 10:15: occupato
    expect(slots).toContain(660);
    expect(slots).toContain(750); // 12:30–13:00, prima della pausa
    expect(slots).not.toContain(765); // dentro la pausa
    expect(slots.at(-1)).toBe(1110);
  });
  it("chiunque: basta che sia libero uno dei due", () => {
    expect(free(null)).toContain(585);
  });
  it("un servizio lungo cerca spazi più grandi", () => {
    expect(free("a", 90)).not.toContain(540);
    expect(free("a", 90)).toContain(660);
  });
  it("per oggi taglia il passato; giorno chiuso: niente", () => {
    expect(free("b", 30, 600)[0]).toBe(600);
    expect(offlineSlots({ ...day, hours: { ...hours, closed: true } }, 30, null)).toEqual([]);
  });
});
