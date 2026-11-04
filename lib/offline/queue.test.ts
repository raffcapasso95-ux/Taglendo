import { describe, expect, it } from "vitest";
import { addItem, addStatus, clearFailure, flushQueue, markFailed, readQueue, removeItem, type Runner, type Store } from "./queue";

const fakeStore = (): Store & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
};

const create = { kind: "create" as const, input: { newClient: { name: "Pietro Lombardi", phone: null }, serviceId: "s1", memberId: null, date: "2026-11-05", startMin: 690 }, label: { client: "Pietro Lombardi", service: "Taglio uomo" } };
const status = (appointmentId: string, s: "completato" | "non_presentato") => ({ kind: "status" as const, appointmentId, status: s, label: { client: "Luca", service: "Taglio" } });

describe("coda offline", () => {
  it("salva e rilegge nell'ordine", () => {
    const s = fakeStore();
    addItem(s, create, 1);
    addItem(s, status("a1", "completato"), 2);
    expect(readQueue(s).map((i) => i.kind)).toEqual(["create", "status"]);
    expect(readQueue(s)[0]).toMatchObject({ at: 1, label: { client: "Pietro Lombardi" } });
  });

  it("un dato rovinato non rompe niente", () => {
    const s = fakeStore();
    s.setItem("tg-offline-queue", "{non json");
    expect(readQueue(s)).toEqual([]);
    s.setItem("tg-offline-queue", JSON.stringify([{ foo: 1 }, { id: "x", kind: "create", at: 5 }]));
    expect(readQueue(s)).toHaveLength(1);
  });

  it("un secondo cambio di stato sullo stesso appuntamento sostituisce il primo", () => {
    const s = fakeStore();
    addStatus(s, status("a1", "completato"));
    addStatus(s, status("a2", "completato"));
    addStatus(s, status("a1", "non_presentato"));
    const items = readQueue(s);
    expect(items).toHaveLength(2);
    expect(items.find((i) => i.kind === "status" && i.appointmentId === "a1")).toMatchObject({ status: "non_presentato" });
  });

  it("toglie, segna gli errori e li cancella", () => {
    const s = fakeStore();
    const a = addItem(s, create);
    markFailed(s, a.id, "L’orario non è più libero");
    expect(readQueue(s)[0]!.error).toBe("L’orario non è più libero");
    clearFailure(s, a.id);
    expect(readQueue(s)[0]!.error).toBeUndefined();
    removeItem(s, a.id);
    expect(readQueue(s)).toEqual([]);
  });

  it("al ritorno della rete manda tutto in ordine e svuota", async () => {
    const s = fakeStore();
    addItem(s, create);
    addItem(s, status("a1", "completato"));
    const calls: string[] = [];
    const run: Runner = {
      create: async (i) => (calls.push(`create ${i.startMin}`), { ok: true }),
      status: async (id, st) => (calls.push(`${id} ${st}`), { ok: true }),
    };
    expect(await flushQueue(s, run)).toEqual({ sent: 2, failed: 0, offline: false });
    expect(calls).toEqual(["create 690", "a1 completato"]);
    expect(readQueue(s)).toEqual([]);
  });

  it("se il server dice no, segna l'errore, passa oltre e non lo ripete", async () => {
    const s = fakeStore();
    addItem(s, create);
    addItem(s, status("a1", "completato"));
    let attempts = 0;
    const run: Runner = {
      create: async () => (attempts++, { ok: false, error: "L’orario non è più libero" }),
      status: async () => ({ ok: true }),
    };
    expect(await flushQueue(s, run)).toEqual({ sent: 1, failed: 1, offline: false });
    expect(readQueue(s)).toHaveLength(1);
    expect(readQueue(s)[0]).toMatchObject({ kind: "create", error: "L’orario non è più libero" });
    await flushQueue(s, run);
    expect(attempts).toBe(1); // l'item fallito aspetta chi l'ha fatto
  });

  it("se la rete cade a metà si ferma e tiene il resto", async () => {
    const s = fakeStore();
    addItem(s, status("a1", "completato"));
    addItem(s, status("a2", "completato"));
    let n = 0;
    const run: Runner = {
      create: async () => ({ ok: true }),
      status: async () => {
        n += 1;
        if (n === 2) throw new Error("rete");
        return { ok: true };
      },
    };
    expect(await flushQueue(s, run)).toEqual({ sent: 1, failed: 0, offline: true });
    expect(readQueue(s).map((i) => (i.kind === "status" ? i.appointmentId : ""))).toEqual(["a2"]);
  });
});
