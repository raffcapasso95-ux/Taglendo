import { expect, test } from "@playwright/test";
import { freshOwner } from "./agenda-helpers";
import { adminUpdate, signIn, visibleText } from "./helpers";

const SALON = "5a100000-0000-4000-8000-000000000001";
const PAGE = "/barberia-saragozza";

test.describe("Pagina pubblica del salone", () => {
  test("si vede senza accedere: nome, listino, barbieri, orari, telefono", async ({ page }) => {
    await adminUpdate("salons", `id=eq.${SALON}`, { show_prices: true });
    await page.goto(PAGE);
    await expect(page).toHaveTitle(/Barberia Saragozza/);
    await expect(page.getByRole("heading", { level: 1, name: "Barberia Saragozza" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Si prenota al telefono." })).toBeVisible();
    await expect(visibleText(page, "Taglio uomo")).toBeVisible();
    await expect(visibleText(page, "20 €")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chi ti taglia." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Via Saragozza 48, Bologna" })).toBeVisible();
    await expect(page.getByText("Lunedì").first()).toBeVisible();
    const call = page.getByRole("link", { name: "Chiama per prenotare" }).first();
    await expect(call).toHaveAttribute("href", "tel:+390516442190");
  });

  test("non mostra dati privati", async ({ page }) => {
    await page.goto(PAGE);
    const html = await page.content();
    expect(html).not.toMatch(/marco@|andrea@|invite|service_role|sb_secret/i);
  });

  test("con i prezzi nascosti non compare nessuna cifra del listino", async ({ page }) => {
    await adminUpdate("salons", `id=eq.${SALON}`, { show_prices: false });
    try {
      await page.goto(PAGE);
      await expect(visibleText(page, "Taglio uomo")).toBeVisible();
      await expect(visibleText(page, "Prezzi in salone: chiedi pure al telefono.")).toBeVisible();
      await expect(page.getByText(/\d+ €/)).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Vedi i servizi" })).toBeVisible();
    } finally {
      await adminUpdate("salons", `id=eq.${SALON}`, { show_prices: true });
    }
  });

  test("un link che non esiste dice che la pagina non c'è", async ({ page }) => {
    await page.goto("/questo-salone-non-esiste");
    await expect(page.getByRole("heading", { name: "Barberia Saragozza" })).toHaveCount(0);
    await expect(page.getByText(/non trovata|404|could not be found/i).first()).toBeVisible();
  });

  test("cookie: rifiuta, la scelta resta e si riapre dal piè di pagina", async ({ page, context }) => {
    await page.goto(PAGE);
    const banner = page.getByRole("dialog", { name: "Cookie" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Rifiuta" }).click();
    await expect(banner).toHaveCount(0);
    expect((await context.cookies()).find((c) => c.name === "tg_cookie")?.value).toBe("necessari");

    await page.reload();
    await expect(page.getByRole("dialog", { name: "Cookie" })).toHaveCount(0);

    await page.getByRole("button", { name: "Preferenze cookie" }).click();
    await page.getByRole("button", { name: "Scegli quali" }).click();
    const stats = page.getByRole("switch", { name: /Statistiche/ });
    await expect(stats).toHaveAttribute("aria-checked", "false");
    await stats.click();
    await page.getByRole("button", { name: "Salva le scelte" }).click();
    expect((await context.cookies()).find((c) => c.name === "tg_cookie")?.value).toBe("tutti");
  });
});

test.describe("Link nell'app", () => {
  test("mostra l'indirizzo della pagina e le regole", async ({ page }) => {
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo");
    await page.goto("/link");
    await expect(page.getByRole("heading", { level: 1, name: "Il tuo link" })).toBeVisible();
    await expect(page.getByTestId("salon-url")).toContainText("/barberia-saragozza");
    await expect(page.getByRole("button", { name: "Copia link" })).toBeVisible();
    await expect(visibleText(page, "Prenotazione online")).toBeVisible();
    await expect(page.getByRole("link", { name: "Apri la tua pagina" })).toHaveAttribute("href", /\/barberia-saragozza$/);
  });

  test("un salone nuovo ha subito la sua pagina", async ({ page, browser }) => {
    await freshOwner(page, "Barberia Nuova Pagina");
    await page.goto("/link");
    await expect(page.getByTestId("salon-url")).toContainText("/barberia-nuova-pagina");
    const href = await page.getByRole("link", { name: "Apri la tua pagina" }).getAttribute("href");
    const visitor = await browser.newPage();
    await visitor.goto(new globalThis.URL(href!).pathname);
    await expect(visitor.getByRole("heading", { level: 1, name: "Barberia Nuova Pagina" })).toBeVisible();
    await visitor.close();
  });
});
