import { expect, test } from "@playwright/test";
import { adminSelect, adminUpdate, signIn } from "./helpers";

const listed = async () => (await adminSelect<{ listed: boolean }>("salons", "select=listed&slug=eq.barberia-saragozza"))[0]!.listed;

// il salone demo è a Bologna e compare nella ricerca; altre prove possono aggiungere saloni, quindi niente conteggi esatti
const showDemo = () => adminUpdate("salons", "slug=eq.barberia-saragozza", { listed: true });

test.describe("Ricerca dei saloni", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await showDemo();
    // il banner dei cookie (che blocca la pagina finché non si sceglie) ha le sue prove: qui è già scelto
    await context.addCookies([{ name: "tg_cookie", value: "necessari", url: baseURL! }]);
  });

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
    await expect(card).toContainText("da "); // il prezzo «da …»
    await expect(card).toContainText(/\d+ min/); // i servizi con la durata
    // i prossimi orari liberi: pulsanti che portano al salone
    await expect(card.getByRole("link", { name: /^Prenota da Barberia Saragozza: / }).first()).toHaveAttribute("href", "/barberia-saragozza");
    // le città con saloni in fondo alla home
    await page.goto("/");
    await expect(page.getByRole("link", { name: /^Barbieri a Bologna \d+ saloni?$/ })).toHaveAttribute("href", "/barbieri/bologna");
    // le grandi città ci sono sempre, anche senza saloni
    await expect(page.getByRole("link", { name: "Barbieri a Roma" })).toHaveAttribute("href", "/barbieri/roma");
    // i saloni arrivati da poco, con la foto
    await expect(page.getByRole("heading", { name: "Nuovi su Taglendo" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Barberia Saragozza/ }).first()).toHaveAttribute("href", "/barberia-saragozza");
    await page.goto("/cerca?dove=Bologna");
    await page.locator('[data-salon="barberia-saragozza"]').getByRole("link", { name: "Barberia Saragozza", exact: true }).click();
    await expect(page).toHaveURL(/\/barberia-saragozza$/, { timeout: 30_000 }); // in sviluppo la pagina si compila al primo giro
  });

  test("servizio, città e giorno: la barra cerca con tutti e tre, e basta anche la città", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Servizio" }).click();
    await page.getByRole("option", { name: "Barba", exact: true }).click();
    await page.getByRole("combobox", { name: "Dove" }).fill("bolo");
    await expect(page.getByRole("option", { name: /^Bologna\s*BO$/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Quando:/ }).click();
    await page.getByRole("dialog", { name: "Scegli il giorno" }).getByRole("button", { name: "Domani", exact: true }).click();
    await expect(page.getByRole("button", { name: "Quando: Domani" })).toBeVisible();
    // «bolo» + Cerca: si prende la prima città suggerita
    await page.getByRole("button", { name: "Cerca", exact: true }).click();
    await expect(page).toHaveURL(/\/cerca\?servizio=Barba&dove=Bologna&data=\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Barba a Bologna · (domani|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)/);
    // nelle schede i servizi cercati vengono per primi
    const first = page.locator("[data-salon]").first();
    await expect(first.getByRole("listitem").first()).toContainText(/Barba/);
    // senza città: la barra lo chiede
    await page.goto("/");
    await page.getByRole("combobox", { name: "Servizio" }).fill("Taglio");
    await page.getByRole("button", { name: "Cerca", exact: true }).click();
    await expect(page.getByText("Scrivi dove cerchi, o usa «Vicino a me».")).toBeVisible();
    // dai riquadri «Cosa ti serve?» il servizio arriva già scelto
    await page.getByRole("link", { name: /^Barba Rifinitura/ }).click();
    await expect(page).toHaveURL(/\/cerca\?servizio=Barba$/);
    await expect(page.getByRole("combobox", { name: "Servizio" })).toHaveValue("Barba");
    await expect(page.getByText(/Scrivi una città o usa «Vicino a me»/)).toBeVisible();
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
    await page.getByRole("combobox", { name: "Dove" }).click();
    await page.getByRole("option", { name: /Vicino a me/ }).click();
    await expect(page).toHaveURL(/\/cerca\?lat=44\.49\d*&lng=11\.34\d*/);
    await expect(page.getByRole("heading", { level: 1, name: "Barbieri vicino a te · Bologna" })).toBeVisible();
    await expect(page.locator('[data-salon="barberia-saragozza"]')).toBeVisible();
    await ctx.close();
  });

  test("pagina per città: titolo per Google, indirizzo unico, città inesistente «non trovata»", async ({ page, request }) => {
    await page.goto("/barbieri/bologna");
    await expect(page).toHaveTitle("Barbieri a Bologna · Prenota online · Taglendo");
    await expect(page.locator('[data-salon="barberia-saragozza"]')).toBeVisible();
    await page.goto("/barbieri/BOLOGNA");
    await expect(page).toHaveURL(/\/barbieri\/bologna$/);
    // città inesistente: la pagina «non trovata», fuori dai motori di ricerca (in produzione la risposta è a flusso, come per i saloni)
    await page.goto("/barbieri/non-esiste");
    await expect(page.getByRole("link", { name: "Torna alla pagina iniziale" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
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
      await expect(map).toBeVisible();
      await page.getByRole("button", { name: "Elenco" }).click();
      await expect(map).toBeHidden();
      await page.getByRole("button", { name: "Mappa" }).click();
    } else {
      // su computer la mappa si può nascondere: l'elenco si allarga
      await page.getByRole("button", { name: "Nascondi la mappa" }).click();
      await expect(map).toBeHidden();
      await page.getByRole("button", { name: "Mostra la mappa" }).click();
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
