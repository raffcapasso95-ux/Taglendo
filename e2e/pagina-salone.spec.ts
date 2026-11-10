import { expect, test } from "@playwright/test";
import { freshOwner } from "./agenda-helpers";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP41JOPFTEMLQkASVh7QR5L4LAAAAAASUVORK5CYII=", "base64");

test.describe("Pagina del salone", () => {
  test("cambia la presentazione, gli interruttori e le foto", async ({ page }) => {
    await freshOwner(page, "Barberia Pagina Uno");
    await page.goto("/impostazioni/pagina");
    await expect(page.getByRole("heading", { name: "Pagina del salone", exact: true })).toBeVisible();

    await page.getByLabel("Descrizione").fill("Taglio e barba a Bologna.");
    await page.getByLabel("Zona").fill("Porta Saragozza");
    await page.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(page.getByText("Pagina salvata").filter({ visible: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Descrizione")).toHaveValue("Taglio e barba a Bologna.");

    const prices = page.getByRole("switch", { name: /Mostra i prezzi/ });
    await prices.click();
    await expect(prices).toHaveAttribute("aria-checked", "false");
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(page.getByRole("switch", { name: /Mostra i prezzi/ })).toHaveAttribute("aria-checked", "false");

    await expect(page.getByText("0 di 8")).toBeVisible();
    await page.locator('input[type="file"]:not([aria-label])').setInputFiles({ name: "uno.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("1 di 8")).toBeVisible();
    await page.locator('input[type="file"]:not([aria-label])').setInputFiles({ name: "due.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("2 di 8")).toBeVisible();
    await expect(page.getByText("Copertina", { exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Usa come copertina" }).click();
    await expect(page.getByText("Copertina", { exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Togli la foto" }).first().click();
    await expect(page.getByText("1 di 8")).toBeVisible();
  });

  test("il logo si carica, compare in agenda e sulla pagina pubblica, e si toglie", async ({ page, browser }) => {
    await freshOwner(page, "Barberia Col Logo");
    await page.goto("/impostazioni/pagina");
    // si clicca il pulsante come farebbe una persona: così si aspetta anche che la pagina sia pronta
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Carica il logo" }).click();
    await (await chooser).setFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("Logo salvato").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Logo di Barberia Col Logo" })).toBeVisible();
    await page.goto("/agenda");
    const badge = page.getByRole("link", { name: "Barberia Col Logo", exact: true }).filter({ visible: true }).first();
    await expect(badge.locator("img")).toHaveAttribute("src", /salon-photos\/.+\/logo-/);
    const slug = (await page.evaluate(() => fetch("/salone").then((r) => r.text()))).match(/barberia-col-logo[a-z0-9-]*/)?.[0] ?? "barberia-col-logo";
    const visitor = await browser.newPage();
    await visitor.goto(`/${slug}`);
    await expect(visitor.locator("header img[src*='/logo-']").first()).toBeVisible();
    await visitor.close();
    await page.goto("/impostazioni/pagina");
    await page.getByRole("button", { name: "Togli il logo" }).click();
    await expect(page.getByRole("img", { name: "Logo di Barberia Col Logo" })).toHaveCount(0);
  });
});
