import { describe, expect, it } from "vitest";
import { csvCell, csvDate, csvEuros, csvFile, csvFileName, csvRow } from "./csv";

describe("csv", () => {
  it("mette tra virgolette ciò che contiene ; \" o a capo", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('dice "ciao"')).toBe('"dice ""ciao"""');
    expect(csvCell("riga1\nriga2")).toBe('"riga1\nriga2"');
    expect(csvCell("semplice")).toBe("semplice");
  });
  it("disinnesca le formule", () => {
    for (const bad of ["=SOMMA(A1)", "+39 333", "-1", "@cmd", "\tx"]) expect(csvCell(bad).replace(/^"/, "")).toMatch(/^'/);
    expect(csvCell(-5)).toBe("-5");
  });
  it("celle vuote", () => {
    expect(csvCell(null)).toBe("");
    expect(csvRow(["a", null, 3])).toBe("a;;3");
  });
  it("il file ha BOM e CRLF", () => {
    expect(csvFile(["a;b", "c;d"])).toBe("﻿a;b\r\nc;d\r\n");
  });
  it("date, importi e nome del file all’italiana", () => {
    expect(csvDate("2026-10-20")).toBe("20/10/2026");
    expect(csvDate(null)).toBe("");
    expect(csvEuros(2050)).toBe("20,50");
    expect(csvFileName("Luca Rossi", "2026-11-04")).toBe("luca-rossi-2026-11-04.csv");
    expect(csvFileName("Zoë D’Àngelo", "2026-11-04")).toBe("zoe-d-angelo-2026-11-04.csv");
  });
});
