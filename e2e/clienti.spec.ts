import { expect, test, type Page } from "@playwright/test";
import { dialog } from "./agenda-helpers";
import { adminUpdate, signIn, visibleText } from "./helpers";

const DEMO = "taglendo-demo";
const SALON = "5a100000-0000-4000-8000-000000000001";
const owner = (page: Page) => signIn(page, "andrea@barberia-saragozza.example", DEMO);
const barber = (page: Page) => signIn(page, "marco@barberia-saragozza.example", DEMO);
const search = (page: Page) => page.getByLabel("Cerca per nome o ultime cifre del telefono");

test.describe("Clienti", () => {
  test("rubrica: cerca per nome, filtri e nessun risultato", async ({ page }) => {
    await owner(page);
    await page.goto("/clienti");
    await expect(page.getByRole("heading", { level: 1, name: "Clienti" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Tutti · \d+$/ })).toBeVisible();

    await search(page).fill("rossi");
    await expect(page.getByRole("link", { name: /^Luca Rossi/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Antonio Esposito/ })).toHaveCount(0);

    await search(page).fill("zzzz");
    await expect(visibleText(page, "Nessun cliente per “zzzz”")).toBeVisible();
    await expect(visibleText(page, "Controlla come è scritto il nome, oppure cerca le ultime cifre del telefono.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Nuovo appuntamento con questo nome" })).toBeVisible();

    await search(page).fill("");
    await page.getByRole("button", { name: /^Da richiamare · \d+$/ }).click();
    await expect(visibleText(page, /Non vengono da più di 5 settimane/)).toBeVisible();
  });

  test("nuovo appuntamento con il nome cercato", async ({ page }) => {
    await owner(page);
    await page.goto("/clienti");
    await search(page).fill("Mario Inventato");
    await page.getByRole("link", { name: "Nuovo appuntamento con questo nome" }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByLabel("Nome")).toHaveValue("Mario Inventato");
    await expect(page).toHaveURL(/\/agenda$/);
  });

  test("scheda: nota privata e Prenota il solito", async ({ page }) => {
    await owner(page);
    await page.goto("/clienti");
    await page.getByRole("link", { name: /^Luca Rossi/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Luca Rossi" })).toBeVisible();
    await expect(visibleText(page, /Cliente da .* · \d+ visite/)).toBeVisible();
    await expect(visibleText(page, "Ultime visite")).toBeVisible();

    const note = page.getByLabel(/Preferenze e note private/);
    const text = `Sfumatura bassa ${Date.now()}`;
    await note.fill(text);
    await page.getByRole("button", { name: "Salva nota" }).click();
    await expect(page.getByText("Nota salvata").filter({ visible: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/Preferenze e note private/)).toHaveValue(text);

    await page.getByRole("link", { name: "Prenota il solito" }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByText("Luca Rossi").first()).toBeVisible();
    await expect(page).toHaveURL(/\/agenda$/);
  });

  test("senza il permesso il barbiere non vede telefono né email", async ({ page }) => {
    await adminUpdate("salons", `id=eq.${SALON}`, { barbers_contacts: false });
    await barber(page);
    await page.goto("/clienti");
    await page.getByRole("link", { name: /^Luca Rossi/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Luca Rossi" })).toBeVisible();
    await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Chiama" })).toHaveCount(0);
    await expect(visibleText(page, "I contatti dei clienti li vede solo il titolare.")).toBeVisible();
    await adminUpdate("salons", `id=eq.${SALON}`, { barbers_contacts: true });
  });

  test("un cliente che non esiste dà pagina non trovata", async ({ page }) => {
    await owner(page);
    await page.goto("/clienti/00000000-0000-4000-8000-00000000dead");
    await expect(page.getByRole("heading", { level: 1, name: "Luca Rossi" })).toHaveCount(0);
    await expect(visibleText(page, /non trovata|404/i)).toBeVisible();
  });
});
