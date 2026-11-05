import { expect, test } from "@playwright/test";
import { createVerifiedUser, PASSWORD, signIn, uniqueEmail, waitForEmail } from "./helpers";

test.describe("Accesso e password", () => {
  test("credenziali sbagliate", async ({ page }) => {
    await signIn(page, "andrea@barberia-saragozza.example", "password-sbagliata", { expectError: true });
    await expect(page.getByText("Email o password non corretti.")).toBeVisible();
    await expect(page).toHaveURL(/\/accedi/);
  });

  test("il titolare del salone demo entra in agenda", async ({ page, viewport }) => {
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo");
    await expect(page).toHaveURL(/\/agenda$/);
    await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toBeVisible();
    // il saluto c'è solo sul telefono: su desktop lo spazio serve alla griglia
    if ((viewport?.width ?? 0) < 1024) await expect(page.getByText(/^Buongiorno, Andrea$|^Agenda di /).filter({ visible: true })).toBeVisible();
  });

  test("senza accesso le aree riservate portano a /accedi e poi alla pagina richiesta", async ({ page }) => {
    await page.goto("/clienti");
    await expect(page).toHaveURL(/\/accedi\?next=%2Fclienti/);
    await page.getByLabel("Email").fill("andrea@barberia-saragozza.example");
    await page.getByLabel("Password", { exact: true }).fill("taglendo-demo");
    await page.getByRole("button", { name: "Accedi", exact: true }).click();
    await expect(page).toHaveURL(/\/clienti$/);
  });

  test("chi ha già l'accesso non vede più /accedi", async ({ page }) => {
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo");
    await expect(page).toHaveURL(/\/agenda$/);
    await page.goto("/accedi");
    await expect(page).toHaveURL(/\/agenda$/);
  });

  test("password dimenticata: link per email, nuova password, entra in agenda", async ({ page, baseURL }) => {
    const email = uniqueEmail("recupero");
    await createVerifiedUser(email);

    await page.goto("/password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Invia il link" }).click();
    await expect(page.getByText("Email inviata")).toBeVisible();

    const { html } = await waitForEmail(email);
    const href = /href="([^"]*\/auth\/conferma[^"]*)"/.exec(html)?.[1]?.replace(/&amp;/g, "&");
    expect(href).toBeTruthy();
    const link = new URL(href!);
    await page.goto(`${baseURL}${link.pathname}${link.search}`);

    await expect(page).toHaveURL(/\/nuova-password$/);
    await page.getByLabel("Nuova password").fill("NuovaPassword9!");
    await page.getByLabel("Ripeti la password").fill("NuovaPassword9");
    await page.getByLabel("Nuova password").click(); // esce dal campo di ripetizione
    await expect(page.getByText("Le due password non coincidono.")).toBeVisible();
    await page.getByLabel("Ripeti la password").fill("NuovaPassword9!");
    await page.getByRole("button", { name: "Salva e accedi" }).click();
    // entra, e il primo avvio è ancora da fare
    await expect(page).toHaveURL(/\/primo-avvio\/1$/);

    // con la vecchia password non si entra più
    await page.context().clearCookies();
    await signIn(page, email, PASSWORD, { expectError: true });
    await expect(page.getByText("Email o password non corretti.")).toBeVisible();
    await signIn(page, email, "NuovaPassword9!");
    await expect(page).toHaveURL(/\/primo-avvio\/1$/);
  });

  test("link di recupero scaduto o inventato", async ({ page }) => {
    await page.goto("/auth/conferma?token_hash=inventato&type=recovery");
    await expect(page).toHaveURL(/\/password\?errore=link/);
    await expect(page.getByText("Il link non è più valido. Chiedine uno nuovo.")).toBeVisible();
  });
});
