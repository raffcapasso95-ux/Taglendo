import { expect, test } from "@playwright/test";

/**
 * Anteprima privata. Questi test servono un server avviato con il cancello chiuso:
 *   SITE_PRIVATE=true PREVIEW_USER=prova PREVIEW_PASSWORD=Anteprima-prova-9! PREVIEW_SECRET=segreto-di-prova-0123456789 npx next dev
 * e si lanciano con E2E_GATE=1. Negli altri casi vengono saltati (il sito di sviluppo è aperto).
 */
test.skip(process.env.E2E_GATE !== "1", "serve un server con SITE_PRIVATE=true");

const USER = "prova";
const PASSWORD = "Anteprima-prova-9!";

test.describe("Anteprima privata", () => {
  test("chi non ha il permesso vede solo «A breve online», ovunque", async ({ page }) => {
    for (const path of ["/", "/accedi", "/registrati", "/agenda", "/privacy", "/barberia-saragozza", "/qualunque-cosa"]) {
      const res = await page.goto(path);
      await expect(page.getByRole("heading", { name: "Stiamo ultimando gli ultimi dettagli." }), path).toBeVisible();
      expect(res?.headers()["x-robots-tag"], path).toContain("noindex");
      await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/$" : path}$`)); // l'indirizzo non cambia
    }
  });

  test("i motori di ricerca non devono indicizzare niente", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/User-Agent: \*\s+Disallow: \//i);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toMatch(/<loc>/);
  });

  test("restano raggiungibili il lavoro automatico e i pagamenti, ma protetti dai loro segreti", async ({ request }) => {
    const cron = await request.get("/api/cron/run");
    expect(cron.status()).toBe(401); // risponde l'API, non la pagina «a breve»
    expect(cron.headers()["content-type"] ?? "").not.toContain("text/html");
  });

  test("utente o password sbagliati: non si entra", async ({ page }) => {
    await page.goto("/accesso-riservato");
    await page.getByLabel("Utente").fill(USER);
    await page.getByLabel("Password", { exact: true }).fill("sbagliata");
    await page.getByRole("button", { name: "Entra" }).click();
    await expect(page.getByText("Utente o password non corretti.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Stiamo ultimando gli ultimi dettagli." })).toBeVisible();
  });

  test("con utente e password giusti si vede il sito vero, per 30 giorni", async ({ page, context }) => {
    await page.goto("/accesso-riservato?next=/accedi");
    await page.getByLabel("Utente").fill(USER.toUpperCase()); // l'utente non bada alle maiuscole
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Entra" }).click();
    await expect(page).toHaveURL(/\/accedi$/);
    await expect(page.getByRole("button", { name: "Accedi", exact: true })).toBeVisible();

    const cookie = (await context.cookies()).find((c) => c.name === "tg_preview");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    expect((cookie?.expires ?? 0) * 1000 - Date.now()).toBeGreaterThan(29 * 86400_000);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Stiamo ultimando gli ultimi dettagli." })).toHaveCount(0);
    await page.goto("/barberia-saragozza");
    await expect(page.getByRole("heading", { name: "Barberia Saragozza" }).first()).toBeVisible();
  });

  test("un cookie inventato o modificato non fa entrare", async ({ page, context }) => {
    const base = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3100");
    await context.addCookies([{ name: "tg_preview", value: `${Math.floor(Date.now() / 1000) + 99999999}.firmainventata`, domain: base.hostname, path: "/" }]);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Stiamo ultimando gli ultimi dettagli." })).toBeVisible();
  });

  test("la pagina «a breve» non ha problemi di accessibilità e non scorre di lato", async ({ page }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await page.goto("/");
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
