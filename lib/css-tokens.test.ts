import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Ogni `var(--nome)` usato nei CSS deve essere definito da qualche parte: un nome mancante vale «niente» (es. padding 0). */
function cssFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    // design/ contiene i prototipi di riferimento (anche il CSS compilato del ridisegno), non il codice dell'app
    if (name === "node_modules" || name === ".next" || name === "design" || name.startsWith(".")) continue;
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

describe("hover su schermi a tocco", () => {
  it("ogni regola :hover sta dentro @media (hover: hover): sul telefono non resta «incollata» dopo il tocco", () => {
    const offenders: string[] = [];
    for (const f of cssFiles(process.cwd())) {
      const text = readFileSync(f, "utf8");
      // si scorrono le righe tenendo conto delle parentesi graffe: quando si apre un blocco @media con hover, ci si segna la profondità
      let depth = 0;
      const hoverDepths: number[] = [];
      let pending = "";
      for (const raw of text.split("\n")) {
        const line = raw.replace(/\/\*.*?\*\//g, "");
        const opens = (line.match(/\{/g) ?? []).length;
        const closes = (line.match(/\}/g) ?? []).length;
        pending += line;
        if (opens > 0) {
          const prelude = pending.slice(0, pending.lastIndexOf("{"));
          const inside = hoverDepths.length > 0;
          if (/@media[^{]*hover:\s*hover/.test(prelude)) hoverDepths.push(depth + 1);
          else if (/:hover/.test(prelude.split(/[};]/).pop() ?? "") && !inside) offenders.push(`${f.replace(process.cwd() + "/", "")}: ${prelude.trim().split("\n").pop()?.trim()}`);
          pending = "";
        } else if (/[;}]\s*$/.test(line)) {
          pending = "";
        }
        depth += opens - closes;
        while (hoverDepths.length && depth < hoverDepths[hoverDepths.length - 1]!) hoverDepths.pop();
      }
    }
    expect(offenders).toEqual([]);
  });
});
