import { expect, test } from "@playwright/test";
import { freshOwner } from "./agenda-helpers";
import { adminSelect, signIn, visibleText } from "./helpers";

const group = (page: import("@playwright/test").Page, name: string) => page.getByRole("group", { name, exact: true });

test.describe("Regole di prenotazione", () => {
  test("il titolare cambia le regole e la pagina pubblica le segue", async ({ page, browser }) => {
    await freshOwner(page, "Barberia Regole");
    await page.goto("/impostazioni/regole");
    await expect(page.getByRole("heading", { level: 1, name: "Prenotazioni dei clienti" })).toBeVisible();

    // parte dai valori di default del database
    await expect(group(page, "Preavviso minimo").getByRole("button", { name: "2 ore" })).toHaveAttribute("aria-pressed", "true");
    await group(page, "Preavviso minimo").getByRole("button", { name: "Il giorno prima" }).click();
    await group(page, "Orari proposti ogni").getByRole("button", { name: "30 min" }).click();
    await group(page, "Prezzi").getByRole("button", { name: "Nascosti" }).click();
    await group(page, "Annullamento online fino a").getByRole("button", { name: "24 ore prima" }).click();
    await page.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(page.getByText("Regole salvate").filter({ visible: true })).toBeVisible();

    const rows = await adminSelect<{ min_notice_min: number; slot_step_min: number; show_prices: boolean; cancel_limit_min: number }>(
      "salons",
      "select=min_notice_min,slot_step_min,show_prices,cancel_limit_min&name=eq.Barberia Regole&order=created_at.desc&limit=1",
    );
    expect(rows[0]).toEqual({ min_notice_min: 1440, slot_step_min: 30, show_prices: false, cancel_limit_min: 1440 });

    // la pagina pubblica non mostra più i prezzi
    await page.goto("/link");
    const shown = (await page.getByTestId("salon-url").textContent()) ?? "";
    const slug = shown.slice(shown.lastIndexOf("/") + 1);
    const visitor = await browser.newPage();
    await visitor.goto(`/${slug}`);
    await expect(visitor.locator("#prenota-card").getByRole("button", { name: /^Taglio uomo/ })).toBeVisible();
    await expect(visitor.locator("#prenota-card").getByText(/\d+ €/)).toHaveCount(0);

    // "Solo telefono": sparisce la prenotazione online e il tab Link lo dice
    await page.goto("/impostazioni/regole");
    await group(page, "Prenotazione online").getByRole("button", { name: "Solo telefono" }).click();
    await expect(page.getByRole("group", { name: "Preavviso minimo" })).toHaveCount(0); // le regole dei clienti si nascondono
    await page.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(page.getByText("Regole salvate").filter({ visible: true })).toBeVisible();
    await visitor.reload();
    await expect(visitor.getByRole("heading", { name: "Si prenota al telefono." })).toBeVisible();
    await page.goto("/link");
    await expect(visibleText(page, "Solo telefono").first()).toBeVisible();
    await visitor.close();
  });

  test("annulla le modifiche non salvate", async ({ page }) => {
    await freshOwner(page, "Barberia Regole Due");
    await page.goto("/impostazioni/regole");
    await group(page, "Prezzi").getByRole("button", { name: "Nascosti" }).click();
    await expect(page.getByRole("button", { name: "Salva", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Annulla", exact: true }).click();
    await expect(group(page, "Prezzi").getByRole("button", { name: "Visibili" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Salva", exact: true })).toHaveCount(0);
  });

  test("un barbiere non entra nelle regole", async ({ page }) => {
    await signIn(page, "marco@barberia-saragozza.example", "taglendo-demo");
    await page.goto("/impostazioni/regole");
    await expect(page).toHaveURL(/\/agenda/);
  });
});
