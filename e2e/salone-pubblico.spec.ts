import { expect, test } from "@playwright/test";
import { freshOwner } from "./agenda-helpers";
import { adminInsert, adminSelect } from "./helpers";

const PAGE = "/barberia-saragozza";
const card = (page: import("@playwright/test").Page) => page.locator("#prenota-card");

async function rejectCookies(page: import("@playwright/test").Page) {
  const banner = page.getByRole("dialog", { name: "Cookie" });
  await banner.waitFor({ timeout: 5000 }).catch(() => {});
  if (await banner.isVisible()) await banner.getByRole("button", { name: "Rifiuta" }).click();
}

test.describe("Pagina del salone: prenotazione a passi", () => {
  test("una domanda alla volta: cosa, con chi, quando, dati; «Cambia» riporta indietro", async ({ page }) => {
    await page.goto(PAGE);
    await rejectCookies(page);
    await expect(card(page).getByText("Passo 1 di 4 · Servizio")).toBeVisible();
    await card(page).getByRole("button", { name: /^Taglio uomo/ }).click();
    await expect(card(page).getByRole("heading", { name: "Con chi?" })).toBeFocused();
    await expect(card(page).getByText("Passo 2 di 4 · Barbiere")).toBeVisible();
    await card(page).getByRole("button", { name: /^Andrea/ }).click();
    await expect(card(page).getByRole("heading", { name: "Quando vieni?" })).toBeVisible();
    const first = card(page).getByRole("button", { name: /Prima disponibilità/ });
    await expect(first).toContainText("con Andrea");
    await first.click();
    await expect(card(page).getByRole("heading", { name: "Ultimo passo: i tuoi dati" })).toBeVisible();
    await expect(card(page).getByText("Taglio uomo · 30 min")).toBeVisible();
    await expect(card(page).getByText("Andrea", { exact: true })).toBeVisible();
    await expect(card(page).getByText("Mancano: nome, email e informativa privacy.")).toBeVisible();
    // freccia indietro e «Cambia»
    await card(page).getByRole("button", { name: "Torna indietro" }).click();
    await expect(card(page).getByRole("heading", { name: "Quando vieni?" })).toBeVisible();
    await card(page).getByRole("button", { name: /Prima disponibilità/ }).click();
    await card(page).getByRole("button", { name: "Cambia" }).nth(1).click();
    await expect(card(page).getByRole("heading", { name: "Con chi?" })).toBeVisible();
  });

  test("«Prenota con Marco» sceglie il barbiere e salta la domanda «Con chi?»", async ({ page }) => {
    await page.goto(PAGE);
    await rejectCookies(page);
    await page.getByRole("link", { name: "Prenota con Marco" }).click();
    await card(page).getByRole("button", { name: /^Barba/ }).click();
    await expect(card(page).getByRole("heading", { name: "Quando vieni?" })).toBeVisible();
    await expect(card(page).getByRole("button", { name: /Prima disponibilità/ })).toContainText("con Marco");
  });

  test("i giorni di chiusura sono spenti; «Altre date» apre il calendario e mostra gli orari liberi", async ({ page }) => {
    await page.goto(PAGE);
    await rejectCookies(page);
    await card(page).getByRole("button", { name: /^Barba/ }).click();
    await card(page).getByRole("button", { name: /^Chi è libero prima/ }).click();
    await expect(card(page).getByRole("group", { name: "Giorno" }).getByRole("button", { name: /chiuso/ }).first()).toBeDisabled();
    await card(page).getByRole("button", { name: /Altre/ }).click();
    const cal = card(page).locator('[data-cal-mode="book"]');
    await expect(cal).toBeVisible();
    await cal.locator("button[data-date]:not([disabled])").nth(2).click();
    await expect(card(page).getByRole("group", { name: /Mattina|Pomeriggio/ }).first()).toBeVisible();
  });
});

test.describe("Pagina del salone: foto e varianti", () => {
  test("le foto aprono il visore con frecce, tastiera e Esc", async ({ page }) => {
    await freshOwner(page, "Barberia Foto Pubbliche");
    const [salon] = await adminSelect<{ id: string; slug: string }>("salons", "select=id,slug&name=eq.Barberia Foto Pubbliche&order=created_at.desc&limit=1");
    for (const [i, name] of ["uno", "due", "tre"].entries()) await adminInsert("salon_photos", { salon_id: salon!.id, path: `${salon!.id}/${name}.jpg`, sort: i });
    await page.goto(`/${salon!.slug}`);
    await rejectCookies(page);
    await expect(page.getByRole("heading", { name: "Dentro la barberia." })).toBeVisible();
    await expect(page.getByText("3 foto · tocca per ingrandire")).toBeVisible();
    await page.getByRole("button", { name: /^Apri la foto 1 di 3/ }).click();
    const viewer = page.getByRole("dialog", { name: "Foto del salone" });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText(/^1 di 3/)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByText(/^2 di 3/)).toBeVisible();
    await viewer.getByRole("button", { name: "Foto precedente" }).click();
    await expect(viewer.getByText(/^1 di 3/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });

  test("una poltrona sola: tre passi, niente «Con chi?» e niente «Prenota con»", async ({ page }) => {
    await freshOwner(page, "Barberia Una Poltrona");
    const [salon] = await adminSelect<{ slug: string }>("salons", "select=slug&name=eq.Barberia Una Poltrona&order=created_at.desc&limit=1");
    await page.goto(`/${salon!.slug}`);
    await rejectCookies(page);
    await expect(card(page).getByText("Passo 1 di 3 · Servizio")).toBeVisible();
    await expect(page.getByRole("link", { name: /^Prenota con/ })).toHaveCount(0);
    await card(page).getByRole("button", { name: /^Taglio uomo/ }).click();
    await expect(card(page).getByRole("heading", { name: "Quando vieni?" })).toBeVisible();
    await expect(page.getByText("Il barbiere", { exact: true })).toBeVisible();
  });
});
