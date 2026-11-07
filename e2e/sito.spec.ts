import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Sito commerciale", () => {
  test("la pagina iniziale mostra il prodotto e porta a registrazione e accesso", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Taglendo — Prenotazioni online e agenda per barbieri/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("La tua agenda online, sempre in tasca.");
    const hero = page.locator("#top");
    await expect(hero.getByRole("link", { name: "Prova gratis" })).toHaveAttribute("href", "#inizia");
    await expect(hero.getByText("Gratis durante la beta")).toBeVisible();
    await expect(page.getByRole("link", { name: "Prova gratis" }).first()).toBeVisible();
    // le immagini ci sono davvero
    const loaded = await hero.locator("img").evaluateAll((imgs) => (imgs as HTMLImageElement[]).map((i) => i.complete && i.naturalWidth > 0));
    expect(loaded.every(Boolean)).toBe(true);
    for (const heading of ["Lo stesso venerdì, sul quaderno e su Taglendo.", "Pronto in 3 passi.", "Online o al telefono: decidi tu.", "Tre cose che smetti di fare.", "Domande frequenti"]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });

  test("nella beta i prezzi dicono «Gratis durante la beta»", async ({ page }) => {
    await page.goto("/");
    const prezzi = page.locator("#prezzi");
    await expect(prezzi.getByRole("heading", { name: "Gratis durante la beta." })).toBeVisible();
    await expect(prezzi.getByText("Quando partiranno gli abbonamenti ti avvisiamo con largo anticipo")).toBeVisible();
    await expect(prezzi.getByText("Listino Taglendo")).toBeVisible();
    await expect(prezzi.getByText("Agenda per poltrona")).toBeVisible();
    await expect(prezzi.getByText("Totale durante la beta")).toBeVisible();
    // nessuna cifra di abbonamento in pagina
    await expect(page.getByText(/9,90|19,90/)).toHaveCount(0);
    await expect(prezzi.getByRole("button", { name: "2" })).toHaveCount(0);
  });

  test("«Prima e dopo» si muove con le frecce e con il trascinamento", async ({ page }) => {
    await page.goto("/");
    const handle = page.getByRole("slider", { name: /Sposta il confronto/ });
    await handle.scrollIntoViewIfNeeded();
    await expect(handle).toHaveAttribute("aria-valuenow", "50");
    await handle.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(handle).toHaveAttribute("aria-valuenow", "45");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(handle).toHaveAttribute("aria-valuenow", "55");
    const box = (await handle.boundingBox())!;
    const container = (await page.locator("section#prima [role=slider]").locator("..").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(container.x + container.width * 0.2, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    const now = Number(await handle.getAttribute("aria-valuenow"));
    expect(now).toBeLessThan(30);
  });

  test("le domande si aprono e rispondono secondo la beta", async ({ page }) => {
    await page.goto("/");
    const q = page.getByText("Ci sono commissioni sulle prenotazioni?");
    await q.scrollIntoViewIfNeeded();
    await expect(page.getByText(/Durante la beta Taglendo è gratis/)).toBeHidden();
    await q.click();
    await expect(page.getByText(/Durante la beta Taglendo è gratis e sulle prenotazioni non ci sono mai commissioni/)).toBeVisible();
    await page.getByText("I miei clienti devono scaricare un’app?").click();
    await expect(page.getByText(/Aprono il tuo link dal telefono/)).toBeVisible();
  });

  test("la chiusura porta alla registrazione e all'accesso", async ({ page }) => {
    await page.goto("/");
    const end = page.locator("#inizia");
    await end.scrollIntoViewIfNeeded();
    await expect(end.getByRole("heading", { name: "Meno telefonate, più tagli." })).toBeVisible();
    await expect(end.getByText("Senza carta di credito")).toBeVisible();
    await expect(end.getByRole("link", { name: "Accedi" })).toHaveAttribute("href", "/accedi");
    await end.getByRole("link", { name: /Crea il mio link gratis/ }).click();
    await expect(page).toHaveURL(/\/registrati/);
  });

  test("online o al telefono: l'interruttore cambia testo e anteprima", async ({ page }) => {
    await page.goto("/");
    const online = page.getByRole("tab", { name: "Prenotazione online" });
    await online.scrollIntoViewIfNeeded();
    await expect(online).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Primi orari liberi")).toBeVisible();
    await page.getByRole("tab", { name: "Solo al telefono" }).click();
    await expect(page.getByText("Nessun appuntamento entra senza passare da te")).toBeVisible();
    await expect(page.getByText("Primi orari liberi")).toBeHidden();
  });

  test("chi ha già una sessione trova «Vai all'agenda»", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner").getByRole("link", { name: "Prova gratis" })).toBeVisible();
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo");
    await page.goto("/");
    await expect(page.getByRole("banner").getByRole("link", { name: "Vai all’agenda" })).toHaveAttribute("href", "/agenda");
    await expect(page.getByRole("banner").getByRole("link", { name: "Accedi", exact: true })).toHaveCount(0);
  });

  test("il banner cookie del sito si può rifiutare e riaprire dal piè di pagina", async ({ page, context }) => {
    await page.goto("/");
    const banner = page.getByRole("dialog", { name: "Cookie" });
    await expect(banner.getByText("Usiamo cookie tecnici per far funzionare il sito.")).toBeVisible();
    await banner.getByRole("button", { name: "Rifiuta" }).click();
    expect((await context.cookies()).find((c) => c.name === "tg_cookie")?.value).toBe("necessari");
    await page.getByRole("contentinfo").getByRole("button", { name: "Preferenze cookie" }).click();
    await expect(page.getByRole("dialog", { name: "Cookie" })).toBeVisible();
  });

  test("il piè di pagina porta alle pagine legali e mostra i dati ancora da completare", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Informativa privacy" })).toHaveAttribute("href", "/privacy");
    await expect(footer.getByRole("link", { name: "Termini di servizio" })).toHaveAttribute("href", "/termini");
    await expect(footer.getByRole("link", { name: "Cookie", exact: true })).toHaveAttribute("href", "/cookie");
    await expect(footer.getByRole("link", { name: "aiuto@taglendo.it" })).toHaveAttribute("href", "mailto:aiuto@taglendo.it");
    await expect(footer.getByText(/^\[.+\]$/)).toHaveCount(3); // ragione sociale, P.IVA, sede
  });

  test("le pagine legali hanno indice, avviso di bozza e testi", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Informativa privacy" })).toBeVisible();
    await expect(page.getByText("Bozza da far verificare")).toBeVisible();
    await expect(page.getByRole("heading", { name: "1. Chi tratta i dati" })).toBeVisible();
    await page.getByRole("navigation", { name: "In questa pagina" }).getByRole("link", { name: "I tuoi diritti" }).click();
    await expect(page).toHaveURL(/#diritti$/);

    await page.goto("/termini");
    await expect(page.getByRole("heading", { level: 1, name: "Termini di servizio" })).toBeVisible();
    await expect(page.getByText("Durante la beta Taglendo è gratuito")).toBeVisible();
    await expect(page.getByText(/9,90/)).toHaveCount(0);

    await page.goto("/cookie");
    await expect(page.getByRole("heading", { level: 1, name: "Cookie" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "tg_cookie" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Durata" })).toBeVisible();
  });

  test("sitemap, robots e anteprima social", async ({ request, page }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toMatch(/<loc>[^<]*\/<\/loc>/);
    expect(xml).toContain("/privacy</loc>");
    expect(xml).toContain("/barberia-saragozza</loc>");
    expect(xml).not.toContain("/agenda");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /agenda");
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
    expect((await request.get("/og.png")).status()).toBe(200);
    await page.goto("/");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og\.png$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /agenda online per barberie/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
  });

  test("sul telefono la barra in basso ricorda di provare", async ({ page }, info) => {
    await page.goto("/");
    const bar = page.getByText("Gratis durante la beta").filter({ visible: true });
    if (info.project.name === "telefono") await expect(page.getByText("App per barbieri")).toBeVisible();
    else await expect(page.getByText("App per barbieri")).toBeHidden();
    await expect(bar.first()).toBeVisible();
  });
});
