import { expect, test } from "@playwright/test";
import { adminSelect, adminUpdate, signIn } from "./helpers";

const listed = async () => (await adminSelect<{ listed: boolean }>("salons", "select=listed&slug=eq.barberia-saragozza"))[0]!.listed;

// il salone demo è a Bologna e compare nella ricerca; altre prove possono aggiungere saloni, quindi niente conteggi esatti
const showDemo = () => adminUpdate("salons", "slug=eq.barberia-saragozza", { listed: true });

test.describe("Ricerca dei saloni", () => {
  test.beforeEach(showDemo);

  test("dalla home: scrivo la città, scelgo il suggerimento, vedo il salone e lo apro", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Prenota il barbiere vicino a te.");
    await expect(page.getByRole("banner").getByRole("link", { name: "Hai un salone?" })).toHaveAttribute("href", "/per-i-saloni");
    const box = page.getByRole("combobox", { name: "Dove" });
    await box.fill("bolo");
    await page.getByRole("option", { name: /^Bologna\s*BO$/ }).click();
    await expect(page).toHaveURL(/\/cerca\?dove=Bologna$/);
    await expect(page.getByRole("heading", { level: 1, name: "Barbieri a Bologna" })).toBeVisible();
    const card = page.locator('[data-salon="barberia-saragozza"]');
    await expect(card).toContainText(/a \d/); // la distanza
    await expect(card).toContainText("da ");
    await expect(card).toContainText(/Primo orario: /);
    // le città con saloni in fondo alla home
    await page.goto("/");
    await expect(page.getByRole("link", { name: /^Bologna \d+ saloni?$/ })).toHaveAttribute("href", "/barbieri/bologna");
    await page.goto("/cerca?dove=Bologna");
    await page.locator('[data-salon="barberia-saragozza"]').click();
    await expect(page).toHaveURL(/\/barberia-saragozza$/);
  });

  test("lontano da tutto: niente saloni entro 30 km, si mostrano i più vicini; una città senza nome: lo dice", async ({ page }) => {
    await page.goto("/cerca?dove=Modena");
    await expect(page.getByText("Nessun salone entro 30 km da Modena. Ecco i più vicini.")).toBeVisible();
    await expect(page.locator('[data-salon="barberia-saragozza"]')).toBeVisible();
    await page.goto("/cerca?dove=Napoli");
    await expect(page.getByText("Nessun salone su Taglendo vicino a Napoli, per ora.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sei un barbiere? Porta qui il tuo salone" })).toHaveAttribute("href", "/per-i-saloni");
    await page.goto("/cerca?dove=Xyzabc");
    await expect(page.getByText(/Non trovo «Xyzabc»/)).toBeVisible();
  });

  test("«Vicino a me» usa la posizione del telefono", async ({ browser }) => {
    const ctx = await browser.newContext({ geolocation: { latitude: 44.4949, longitude: 11.3426 }, permissions: ["geolocation"] });
    const page = await ctx.newPage();
    await page.goto("/cerca");
    await page.getByRole("button", { name: "Vicino a me" }).click();
    await expect(page).toHaveURL(/\/cerca\?lat=44\.49\d*&lng=11\.34\d*/);
    await expect(page.getByRole("heading", { level: 1, name: "Barbieri vicino a te · Bologna" })).toBeVisible();
    await expect(page.locator('[data-salon="barberia-saragozza"]')).toBeVisible();
    await ctx.close();
  });

  test("pagina per città: titolo per Google, indirizzo unico, città inesistente 404", async ({ page, request }) => {
    await page.goto("/barbieri/bologna");
    await expect(page).toHaveTitle("Barbieri a Bologna · Prenota online · Taglendo");
    await expect(page.locator('[data-salon="barberia-saragozza"]')).toBeVisible();
    await page.goto("/barbieri/BOLOGNA");
    await expect(page).toHaveURL(/\/barbieri\/bologna$/);
    expect((await request.get("/barbieri/non-esiste")).status()).toBe(404);
    const map = await request.get("/sitemap.xml");
    const xml = await map.text();
    expect(xml).toContain("/barbieri/bologna");
    expect(xml).toContain("/per-i-saloni");
  });

  test("elenco e mappa: sul telefono si passa alla mappa, su computer stanno insieme", async ({ page, isMobile }) => {
    await page.goto("/cerca?dove=Bologna");
    const salons = await page.locator("[data-salon]").count(); // quanti saloni nell'elenco
    expect(salons).toBeGreaterThan(0);
    const map = page.getByRole("region", { name: "Mappa dei saloni" });
    if (isMobile) {
      await expect(map).toBeHidden();
      await page.getByRole("button", { name: "Mappa" }).click();
    }
    await expect(map).toBeVisible();
    // un segnaposto per ogni salone dell'elenco
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(salons);
  });

  test("il titolare si toglie dalla ricerca e ci torna", async ({ page }) => {
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo");
    try {
      await page.goto("/impostazioni/pagina");
      const sw = page.getByRole("switch", { name: /Compari nella ricerca di Taglendo/ });
      await expect(sw).toHaveAttribute("aria-checked", "true");
      await sw.click();
      await expect(sw).toHaveAttribute("aria-checked", "false");
      await expect.poll(listed).toBe(false); // salvato davvero
      await page.goto("/cerca?dove=Bologna");
      await expect(page.getByRole("heading", { level: 1, name: "Barbieri a Bologna" })).toBeVisible();
      await expect(page.locator('[data-salon="barberia-saragozza"]')).toHaveCount(0); // altre prove creano saloni con lo stesso nome
      await page.goto("/impostazioni/pagina");
      await page.getByRole("switch", { name: /Compari nella ricerca di Taglendo/ }).click();
      await expect.poll(listed).toBe(true);
    } finally {
      await showDemo(); // anche se la prova si ferma a metà, il salone demo torna nella ricerca
    }
  });
});
