import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Ogni `var(--nome)` usato nei CSS deve essere definito da qualche parte: un nome mancante vale «niente» (es. padding 0). */
function cssFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) cssFiles(path, out);
    else if (name.endsWith(".css")) out.push(path);
  }
  return out;
}

describe("variabili CSS", () => {
  it("quelle usate nei file CSS sono tutte definite", () => {
    const files = cssFiles(process.cwd());
    const sources = files.map((f) => ({ f, s: readFileSync(f, "utf8") }));
    const defined = new Set(sources.flatMap(({ s }) => [...s.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]!)));
    // variabili impostate da codice (stile in linea o font di Next), non da un file CSS
    for (const name of ["--font-manrope", "--d"]) defined.add(name);
    const missing = sources.flatMap(({ f, s }) =>
      [...s.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]!).filter((v) => !defined.has(v)).map((v) => `${f.replace(process.cwd() + "/", "")}: ${v}`),
    );
    expect([...new Set(missing)]).toEqual([]);
  });
});
