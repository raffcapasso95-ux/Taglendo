import { describe, expect, it } from "vitest";
import {
  applyFilter,
  clientSinceLine,
  daysBetween,
  greetingMessage,
  groupByLetter,
  isRecall,
  letterOf,
  matchesClient,
  recallMessage,
  rowChip,
  usualLine,
  type ClientRow,
} from "./clients";

const TODAY = "2026-11-03";
const row = (extra: Partial<ClientRow> = {}): ClientRow => ({
  id: "c1",
  name: "Luca Rossi",
  phone: "+39 333 412 8890",
  email: null,
  createdAt: "2024-03-05T10:00:00Z",
  visits: 14,
  lastVisitDate: "2026-10-20",
  nextDate: null,
  nextMin: null,
  usualServiceName: "Taglio uomo",
  usualMemberName: "Andrea",
  hasToday: false,
  avatarColor: null,
  photoUrl: null,
  ...extra,
});

describe("ricerca", () => {
  it("per nome: parti, ordine libero, senza accenti né maiuscole", () => {
    expect(matchesClient(row(), "luc")).toBe(true);
    expect(matchesClient(row(), "ROSSI luca")).toBe(true);
    expect(matchesClient(row({ name: "Nguyễn Văn Thành" }), "nguyen van")).toBe(true);
    expect(matchesClient(row({ name: "Ömer Şahin" }), "omer sahin")).toBe(true);
    expect(matchesClient(row(), "marco")).toBe(false);
    expect(matchesClient(row(), "  ")).toBe(true);
  });

  it("per le cifre del telefono, da 3 in su", () => {
    expect(matchesClient(row(), "8890")).toBe(true);
    expect(matchesClient(row(), "412 8890")).toBe(true);
    expect(matchesClient(row(), "12")).toBe(false); // troppo corta
    expect(matchesClient(row(), "999")).toBe(false);
  });

  it("senza telefono visibile non si trova per cifre", () => {
    expect(matchesClient(row({ phone: null }), "8890")).toBe(false);
  });
});

describe("lettere e ordine", () => {
  it("lettera del nome", () => {
    expect(letterOf("Luca Rossi")).toBe("L");
    expect(letterOf("Ömer Şahin")).toBe("O");
    expect(letterOf("  élodie")).toBe("E");
    expect(letterOf("Kevin 💈")).toBe("K");
    expect(letterOf("💈 Kevin")).toBe("K"); // salta i simboli iniziali
    expect(letterOf("123")).toBe("#");
    expect(letterOf("")).toBe("#");
    expect(letterOf("Ragazzo con lo zaino rosso")).toBe("R");
  });

  it("divide in lettere in ordine alfabetico, i nomi senza lettere in fondo", () => {
    const groups = groupByLetter([
      { name: "Marco Bianchi" },
      { name: "Alessio Ricci" },
      { name: "Antonio Esposito" },
      { name: "Ömer Şahin" },
      { name: "007" },
      { name: "Luca Rossi" },
      { name: "Maria Grazia De Santis (per Tommaso)" },
    ]);
    expect(groups.map((g) => g.letter)).toEqual(["A", "L", "M", "O", "#"]);
    expect(groups[0]!.rows.map((r) => r.name)).toEqual(["Alessio Ricci", "Antonio Esposito"]);
    expect(groups[2]!.rows.map((r) => r.name)).toEqual(["Marco Bianchi", "Maria Grazia De Santis (per Tommaso)"]);
  });
});

describe("da richiamare", () => {
  it("giorni tra due date", () => {
    expect(daysBetween("2026-10-20", "2026-11-03")).toBe(14);
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2027-03-27", "2027-03-29")).toBe(2); // attraverso il cambio d'ora
  });

  it("da 35 giorni, senza appuntamenti in programma", () => {
    expect(isRecall({ lastVisitDate: "2026-09-29", nextDate: null }, TODAY)).toBe(true); // 35 giorni
    expect(isRecall({ lastVisitDate: "2026-09-30", nextDate: null }, TODAY)).toBe(false); // 34 giorni
    expect(isRecall({ lastVisitDate: "2026-09-01", nextDate: "2026-11-10" }, TODAY)).toBe(false); // ha un appuntamento
    expect(isRecall({ lastVisitDate: null, nextDate: null }, TODAY)).toBe(false); // mai venuto: è nuovo, non da richiamare
  });

  it("i filtri", () => {
    const rows = [row({ id: "a", hasToday: true }), row({ id: "b", lastVisitDate: "2026-08-01" }), row({ id: "c" })];
    expect(applyFilter(rows, "all", TODAY)).toHaveLength(3);
    expect(applyFilter(rows, "today", TODAY).map((r) => r.id)).toEqual(["a"]);
    expect(applyFilter(rows, "recall", TODAY).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("targhetta della riga", () => {
  it("prossimo appuntamento: oggi o un altro giorno", () => {
    expect(rowChip(row({ nextDate: TODAY, nextMin: 630 }), TODAY)).toEqual({ text: "Oggi alle 10:30", tone: "next" });
    expect(rowChip(row({ nextDate: "2026-11-06", nextMin: 600 }), TODAY)).toEqual({ text: "Ven 6 nov alle 10:00", tone: "next" });
  });

  it("da richiamare, con le settimane", () => {
    expect(rowChip(row({ lastVisitDate: "2026-09-15" }), TODAY)).toEqual({ text: "Da richiamare · 7 settimane", tone: "recall" });
  });

  it("servito oggi, ultima visita, nuovo cliente", () => {
    expect(rowChip(row({ lastVisitDate: TODAY }), TODAY).text).toBe("Servito oggi");
    expect(rowChip(row(), TODAY).text).toBe("Ultima visita 20 ott");
    expect(rowChip(row({ lastVisitDate: null, visits: 0 }), TODAY)).toEqual({ text: "Nuovo cliente", tone: "plain" });
  });
});

describe("testi", () => {
  it("il solito, con il barbiere solo se sono più d'uno", () => {
    expect(usualLine(row(), true)).toBe("Il solito · Taglio uomo · Andrea");
    expect(usualLine(row(), false)).toBe("Il solito · Taglio uomo");
    expect(usualLine(row({ usualServiceName: null }), true)).toBe("Ancora nessun servizio");
  });

  it("cliente da… e visite al singolare e plurale", () => {
    expect(clientSinceLine("2024-03-05", 14)).toBe("Cliente da marzo 2024 · 14 visite");
    expect(clientSinceLine("2025-12-31", 1)).toBe("Cliente da dicembre 2025 · 1 visita");
    expect(clientSinceLine("2026-10-29", 0)).toBe("Cliente da ottobre 2026 · 0 visite");
  });

  it("messaggi WhatsApp del prototipo", () => {
    expect(recallMessage("Luca")).toBe("Ciao Luca, è da un po’ che non ci vediamo! Ti tengo un posto questa settimana?");
    expect(greetingMessage("Luca")).toBe("Ciao Luca, ");
  });
});
