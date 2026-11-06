import { expect, test } from "@playwright/test";
import { freshOwner } from "./agenda-helpers";
import { signIn } from "./helpers";

const DEMO = "taglendo-demo";

test.describe("Statistiche", () => {
  test("il titolare passa da giorno a settimana, mese e anno e sfoglia i periodi", async ({ page }) => {
    await signIn(page, "andrea@barberia-saragozza.example", DEMO);
    await page.goto("/statistiche");
    await expect(page.getByRole("heading", { level: 1, name: "Statistiche" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mese" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Per operatore" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top clienti" })).toBeVisible();

    await page.getByRole("link", { name: "Periodo precedente" }).click();
    await expect(page).toHaveURL(/periodo=mese&data=/);
    await expect(page.getByRole("link", { name: "Periodo successivo" })).toBeVisible();

    await page.getByRole("link", { name: "Anno" }).click();
    await expect(page.getByRole("link", { name: "Anno" })).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "Settimana" }).click();
    await expect(page.getByRole("link", { name: "Settimana" })).toHaveAttribute("aria-current", "page");

    await page.getByRole("link", { name: "Giorno" }).click();
    await expect(page.getByRole("heading", { name: "Tutti gli appuntamenti" })).toBeVisible();
    await expect(page.getByText("Totale incassato")).toBeVisible();
    await expect(page.getByRole("link", { name: "Invia il resoconto su WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
    await expect(page.getByRole("link", { name: "Giorno successivo" })).toHaveCount(0); // oggi: non si va nel futuro
  });

  test("un salone con un solo barbiere non vede «Per operatore»", async ({ page }) => {
    await freshOwner(page, "Barberia Statistiche Uno");
    await page.goto("/statistiche");
    await expect(page.getByRole("heading", { level: 1, name: "Statistiche" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Per operatore" })).toHaveCount(0);
    await expect(page.getByText("Ancora nessun cliente in questo periodo.")).toBeVisible();
  });

  test("il barbiere non entra: torna all'agenda e non vede la voce nel menu", async ({ page }) => {
    await signIn(page, "marco@barberia-saragozza.example", DEMO);
    await page.goto("/statistiche");
    await expect(page).toHaveURL(/\/agenda/);
    await expect(page.getByRole("link", { name: "Statistiche" })).toHaveCount(0);
  });
});
