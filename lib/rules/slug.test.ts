import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "./slug";

describe("slugify", () => {
  it("genera il link dal nome", () => {
    expect(slugify("Barberia Saragozza")).toBe("barberia-saragozza");
  });

  it("toglie accenti, apostrofi e simboli", () => {
    expect(slugify("Il Barbiere di Nicolò")).toBe("il-barbiere-di-nicolo");
    expect(slugify("L'Arte del Taglio!")).toBe("l-arte-del-taglio");
    expect(slugify("Taglio & Barba")).toBe("taglio-e-barba");
  });

  it("non lascia trattini ai bordi né doppi", () => {
    expect(slugify("  --Figaro--  ")).toBe("figaro");
    expect(slugify("A    B")).toBe("a-b");
  });

  it("taglia a 60 caratteri senza trattino finale", () => {
    const slug = slugify("Barberia ".repeat(20));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("nome vuoto o senza lettere", () => {
    expect(slugify("")).toBe("salone");
    expect(slugify("💈💈")).toBe("salone");
  });

  it("evita le rotte del sito", () => {
    expect(slugify("Agenda")).toBe("agenda-salone");
    expect(slugify("Taglendo")).toBe("taglendo-salone");
  });
});

describe("isValidSlug", () => {
  it("accetta e rifiuta come il database", () => {
    expect(isValidSlug("barberia-saragozza")).toBe(true);
    expect(isValidSlug("figaro2")).toBe(true);
    for (const bad of ["", "Barberia", "con spazi", "-inizio", "fine-", "a--b", "è", "agenda", "api"]) {
      expect(isValidSlug(bad), bad).toBe(false);
    }
    expect(isValidSlug("a".repeat(61))).toBe(false);
  });
});
