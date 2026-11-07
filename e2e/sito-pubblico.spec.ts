import { expect, test } from "@playwright/test";

/** Giro di controllo del sito pubblico e delle pagine d'accesso: nessun errore, nessuno scorrimento laterale, tocchi comodi. */
const PAGES = ["/", "/registrati", "/accedi", "/password", "/privacy", "/termini", "/cookie", "/barberia-saragozza"];

test.describe("Sito pubblico", () => {
  for (const path of PAGES) {
    test(`${path}: si apre senza errori, con un solo titolo e senza scorrere di lato`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("response", (r) => {
        if (r.status() >= 400 && !r.url().includes("favicon")) errors.push(`${r.status()} ${r.url()}`);
      });
      const res = await page.goto(path, { waitUntil: "networkidle" });
      expect(res?.status()).toBe(200);
      expect(await page.title()).not.toBe("");
      await expect(page.locator("h1")).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      // immagini tutte caricate
      expect(await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src))).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test("i link interni delle pagine principali portano tutti a una pagina che esiste", async ({ page, request }) => {
    const hrefs = new Set<string>();
    for (const path of ["/", "/privacy", "/barberia-saragozza"]) {
      await page.goto(path);
      for (const h of await page.locator("a[href^='/']").evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""))) hrefs.add(h.split("#")[0]!);
    }
    for (const h of hrefs) {
      if (!h || h.startsWith("//")) continue;
      const res = await request.get(h);
      expect(res.status(), h).toBeLessThan(400);
    }
  });
});

test.describe("Sito pubblico sul telefono", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 900, "solo telefono");

  test("pagina del salone: un solo «Prenota» in alto, pulsanti dell'hero uguali, barbieri in lista", async ({ page }) => {
    await page.goto("/barberia-saragozza", { waitUntil: "networkidle" });
    // in alto non c'è il doppione del pulsante della barra in basso
    await expect(page.locator("header").getByRole("link", { name: "Prenota", exact: true })).toBeHidden();
    await expect(page.getByRole("link", { name: "Prenota", exact: true }).filter({ visible: true }).first()).toBeVisible(); // quello della barra
    // i due pulsanti dell'hero sono larghi uguale
    const [a, b] = [await page.getByRole("link", { name: "Prenota online" }).first().boundingBox(), await page.getByRole("link", { name: "Vedi servizi e prezzi" }).boundingBox()];
    expect(Math.abs(a!.width - b!.width)).toBeLessThanOrEqual(1);
    // i barbieri non sono tre schermate: ritratti piccoli
    const portraits = await page.locator("#barbieri [class*=portrait]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
    expect(portraits.length).toBeGreaterThan(0);
    expect(Math.max(...portraits)).toBeLessThanOrEqual(100);
  });

  test("tutto ciò che si tocca nel piè di pagina, nei menu e nell'indice è alto almeno 44 px", async ({ page }) => {
    for (const path of ["/", "/privacy", "/barberia-saragozza"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      const rb = page.getByRole("button", { name: "Rifiuta" });
      if (await rb.count()) await rb.first().click();
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("footer a, footer button, nav a, header a:not(:has(img)), [class*=tocLink], [class*=cookieLink]")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.height < 43.5;
          })
          .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 24)}" ${Math.round(el.getBoundingClientRect().height)}px`),
      );
      expect(small, path).toEqual([]);
    }
  });

  test("a 320 px niente scorre di lato: home, accesso e pagina del salone", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    for (const path of ["/", "/accedi", "/registrati", "/barberia-saragozza"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0);
    }
    // la testata della home sta tutta nello schermo
    await page.goto("/", { waitUntil: "networkidle" });
    const right = await page.getByRole("banner").getByRole("link", { name: "Prova gratis" }).evaluate((a) => Math.round(a.getBoundingClientRect().right));
    expect(right).toBeLessThanOrEqual(320);
  });
});
