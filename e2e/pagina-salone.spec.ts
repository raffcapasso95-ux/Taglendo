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
    await page.locator('input[type="file"]').setInputFiles({ name: "uno.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("1 di 8")).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({ name: "due.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("2 di 8")).toBeVisible();
    await expect(page.getByText("Copertina", { exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Usa come copertina" }).click();
    await expect(page.getByText("Copertina", { exact: true })).toHaveCount(1);
    await page.getByRole("button", { name: "Togli la foto" }).first().click();
    await expect(page.getByText("1 di 8")).toBeVisible();
  });
});
