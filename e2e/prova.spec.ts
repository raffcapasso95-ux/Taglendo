import { expect, test } from "@playwright/test";
import { adminSelect, adminUpdate } from "./helpers";
import { bookNewClient, freshOwner, nextOpenDay, newButton } from "./agenda-helpers";

const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const setTrial = (name: string, iso: string) => adminUpdate("salons", `name=eq.${encodeURIComponent(name)}`, { trial_ends_at: iso });

test.describe("La prova: 30 giorni, avviso a 7 giorni, poi sola lettura", () => {
  test("la prova dura 30 giorni, senza avviso finché mancano più di 7 giorni", async ({ page }) => {
    const salon = `Barberia Prova ${Date.now() % 100000}`;
    await freshOwner(page, salon);
    const [s] = await adminSelect<{ trial_ends_at: string; created_at: string }>("salons", `name=eq.${encodeURIComponent(salon)}&select=trial_ends_at,created_at`);
    const days = Math.round((Date.parse(s!.trial_ends_at) - Date.parse(s!.created_at)) / 86400000);
    expect(days).toBe(30);
    await page.goto("/agenda");
    await expect(page.getByRole("button", { name: /^\+ (Nuovo appuntamento|Appuntamento)$/ }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(/La tua prova scade/)).toHaveCount(0);
  });

  test("da 7 giorni prima: avviso con l'email per il rinnovo", async ({ page }) => {
    const salon = `Barberia Avviso ${Date.now() % 100000}`;
    await freshOwner(page, salon);
    await setTrial(salon, inDays(5));
    await page.goto("/agenda");
    const avviso = page.getByRole("status").filter({ hasText: "La tua prova scade tra" });
    await expect(avviso).toBeVisible();
    await expect(avviso).toContainText("Per maggiori informazioni sul rinnovo invia un'email a");
    await expect(avviso.getByRole("link", { name: "aiuto@taglendo.it" })).toHaveAttribute("href", "mailto:aiuto@taglendo.it");
    // si può ancora lavorare
    await expect(newButton(page)).toBeVisible();
    // il giorno prima cambia il titolo
    await setTrial(salon, inDays(1));
    await page.goto("/agenda");
    await expect(page.getByRole("status").filter({ hasText: /La tua prova scade (domani|oggi)/ })).toBeVisible();
  });

  test("agenda su computer con l'avviso in cima: la pagina non scorre (solo la griglia), niente doppio scorrimento", async ({ page, isMobile }) => {
    test.skip(isMobile, "su telefono la pagina scorre per intero");
    const salon = `Barberia Scroll ${Date.now() % 100000}`;
    await freshOwner(page, salon);
    await page.setViewportSize({ width: 1600, height: 900 });
    for (const [days, avviso] of [[-1, "Prova terminata"], [5, "La tua prova scade"]] as const) {
      await setTrial(salon, inDays(days));
      await page.goto("/agenda");
      await expect(page.getByRole("status").filter({ hasText: avviso })).toBeVisible();
      // (l'altezza dell'avviso si misura appena la pagina è pronta)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight), { message: `pagina più alta dello schermo con l'avviso «${avviso}»` })
        .toBeLessThanOrEqual(1);
    }
  });

  test("a prova finita: si vedono gli appuntamenti, non si aggiunge niente, la pagina online non c'è più", async ({ page, browser }) => {
    const salon = `Barberia Scaduta ${Date.now() % 100000}`;
    await freshOwner(page, salon);
    const [s] = await adminSelect<{ slug: string }>("salons", `name=eq.${encodeURIComponent(salon)}&select=slug`);
    // un appuntamento fissato mentre la prova era in corso
    await page.goto("/agenda");
    await bookNewClient(page, "Mario Prova", nextOpenDay(), "10:00");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await setTrial(salon, inDays(-1));
    await page.goto("/agenda");
    const avviso = page.getByRole("status").filter({ hasText: "Prova terminata" });
    await expect(avviso).toBeVisible();
    await expect(avviso.getByRole("link", { name: "aiuto@taglendo.it" })).toBeVisible();
    await expect(newButton(page)).toHaveCount(0);

    // i clienti si leggono, non se ne aggiungono
    await page.goto("/clienti");
    await expect(page.getByText("Mario Prova").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^(\\+ )?(Nuovo cliente|Cliente)$/ }).filter({ visible: true })).toHaveCount(0);

    // la pagina online non è più visibile, nemmeno per chi non ha un account
    const anon = await (await browser.newContext()).newPage();
    await anon.goto(`/${s!.slug}`);
    await expect(anon.getByRole("heading", { name: "Questa pagina non c’è" })).toBeVisible();
    await anon.close();

    // se Taglendo prolunga la prova, torna tutto
    await setTrial(salon, inDays(10));
    await page.goto("/agenda");
    await expect(newButton(page)).toBeVisible();
    await expect(page.getByText("Prova terminata")).toHaveCount(0);
  });
});
