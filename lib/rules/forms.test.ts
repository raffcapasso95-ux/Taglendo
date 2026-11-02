import { describe, expect, it } from "vitest";
import { isCode, isEmail, isPersonName, isPhone, normalizeCode, safeNext } from "./forms";

describe("campi", () => {
  it("email", () => {
    expect(isEmail("andrea@barberiasaragozza.it")).toBe(true);
    for (const bad of ["", "andrea", "andrea@", "@x.it", "a b@x.it", "a@x"]) expect(isEmail(bad), bad).toBe(false);
    expect(isEmail(`${"a".repeat(250)}@x.it`)).toBe(false);
  });

  it("nome: almeno 2 caratteri", () => {
    expect(isPersonName("Jo")).toBe(true);
    expect(isPersonName("J")).toBe(false);
    expect(isPersonName("  ")).toBe(false);
    expect(isPersonName("a".repeat(41), 40)).toBe(false);
  });

  it("telefono: cifre, + e spazi, massimo 20", () => {
    expect(isPhone("051 644 2190")).toBe(true);
    expect(isPhone("+39 333 412 8890")).toBe(true);
    expect(isPhone("051-644")).toBe(false);
    expect(isPhone("0".repeat(21))).toBe(false);
  });

  it("codice di 6 cifre, anche incollato con spazi", () => {
    expect(isCode("482913")).toBe(true);
    expect(isCode("482 913")).toBe(true);
    expect(normalizeCode(" 482 913 ")).toBe("482913");
    expect(isCode("48291")).toBe(false);
    expect(isCode("48291a")).toBe(false);
  });
});

describe("safeNext", () => {
  it("accetta solo percorsi interni", () => {
    expect(safeNext("/clienti")).toBe("/clienti");
    expect(safeNext("/impostazioni/regole?x=1")).toBe("/impostazioni/regole?x=1");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "agenda", "", null, undefined]) {
      expect(safeNext(bad), String(bad)).toBe("/agenda");
    }
  });
});
