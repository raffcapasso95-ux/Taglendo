import { describe, expect, it } from "vitest";
import { homonyms, phoneTail, pickClients, sameName, visitLabel, type PickClient } from "./clientPick";

const c = (id: string, name: string, phone: string | null, lastVisit: string | null): PickClient => ({ id, name, phone, lastVisit });
const list = [
  c("1", "Marco Rossi", "+39 333 412 8890", "2026-10-12"),
  c("2", "Marco Rossi", "347 100 2231", "2026-11-03"),
  c("3", "Luca Bianchi", null, null),
  c("4", "Gianmarco Neri", "320 555 0001", "2026-09-01"),
  c("5", "Ãndrea Ferri", "333 000 1234", "2026-11-07"),
];
const opts = { suggested: 3, results: 8 };

describe("scelta del cliente", () => {
  it("senza ricerca propone gli ultimi venuti", () => {
    expect(pickClients(list, "", opts).map((x) => x.id)).toEqual(["5", "2", "1"]);
  });

  it("la ricerca mette prima chi inizia così, anche dal cognome, e ignora accenti e maiuscole", () => {
    expect(pickClients(list, "marco", opts).map((x) => x.id)).toEqual(["2", "1", "4"]);
    expect(pickClients(list, "ross", opts).map((x) => x.id)).toEqual(["2", "1"]);
    expect(pickClients(list, "andrea", opts).map((x) => x.id)).toEqual(["5"]);
  });

  it("trova per ultime cifre del telefono (almeno 3)", () => {
    expect(pickClients(list, "8890", opts).map((x) => x.id)).toEqual(["1"]);
    expect(pickClients(list, "90", opts)).toEqual([]);
  });

  it("riconosce gli omonimi e mostra le ultime 4 cifre per distinguerli", () => {
    expect([...homonyms(list)]).toEqual(["marco rossi"]);
    expect(phoneTail("+39 333 412 8890")).toBe("8890");
    expect(phoneTail(null)).toBeNull();
    expect(phoneTail("12")).toBeNull();
  });

  it("ultima visita in formato italiano, con l'anno solo se è passato", () => {
    expect(visitLabel("2026-10-12", "2026-11-10")).toBe("12 ott");
    expect(visitLabel("2025-12-03", "2026-11-10")).toBe("3 dic 2025");
  });

  it("prima di creare un cliente nuovo trova chi ha già lo stesso nome", () => {
    expect(sameName(list, "  marco   ROSSI ")?.id).toBe("2");
    expect(sameName(list, "Mario Verdi")).toBeNull();
  });
});
