import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Stati dell'app", () => {
  test("errore di caricamento: dice cosa fare e «Riprova» funziona", async ({ page }) => {
    await page.goto("/dev/ui#stati");
    const alert = page.getByRole("alert").filter({ hasText: "Non riusciamo a caricare" });
    await expect(alert.getByRole("heading")).toHaveText("Non riusciamo a caricare la pagina");
    await expect(alert.getByText("Controlla la connessione e riprova.")).toBeVisible();
    await expect(alert.getByRole("link", { name: "aiuto@taglendo.it" })).toBeVisible();
    await alert.getByRole("button", { name: "Riprova" }).click();
    await expect(page.getByTestId("retries")).toHaveText("1");
  });

  test("segnaposto di caricamento: forma di agenda, non uno spinner", async ({ page }) => {
    await page.goto("/dev/ui#stati");
    const skeleton = page.getByRole("status", { name: "Carico la pagina" });
    await expect(skeleton).toHaveAttribute("aria-busy", "true");
    await expect(skeleton.locator("span[aria-hidden]").first()).toBeVisible();
  });

  test("una pagina che non esiste dice che non c'è", async ({ page }) => {
    await page.goto("/pagina-che-non-esiste-davvero");
    await expect(page.getByRole("heading", { name: "Questa pagina non c’è" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Torna alla pagina iniziale" })).toBeVisible();
  });

  test("sessione scaduta: chiede solo la password e resta dov'è", async ({ page, context }) => {
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo");
    await page.goto("/clienti");
    await expect(page.getByRole("heading", { level: 1, name: "Clienti" })).toBeVisible();
    await page.getByLabel("Cerca per nome o ultime cifre del telefono").fill("rossi");
    await page.waitForTimeout(500); // il primo controllo ha letto l'email

    await context.clearCookies(); // come se la sessione fosse scaduta
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const dialog = page.getByRole("dialog", { name: "Accedi di nuovo" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Per sicurezza ti chiediamo la password ogni 30 giorni.")).toBeVisible();
    await expect(dialog.getByLabel("Email")).toHaveValue("andrea@barberia-saragozza.example");

    await dialog.getByLabel("Password", { exact: true }).fill("sbagliata");
    await dialog.getByRole("button", { name: "Accedi" }).click();
    await expect(dialog.getByText("Password non corretta.")).toBeVisible();

    await dialog.getByLabel("Password", { exact: true }).fill("taglendo-demo");
    await dialog.getByRole("button", { name: "Accedi" }).click();
    await expect(dialog).toHaveCount(0);
    // la pagina è com'era: stessa rotta, stessa ricerca
    await expect(page).toHaveURL(/\/clienti$/);
    await expect(page.getByLabel("Cerca per nome o ultime cifre del telefono")).toHaveValue("rossi");
  });
});
