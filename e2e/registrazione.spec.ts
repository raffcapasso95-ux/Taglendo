import { expect, test } from "@playwright/test";
import { adminSelect, codeFor, completeOnboarding, createVerifiedUser, PASSWORD, signIn, typeCode, uniqueEmail, visibleText } from "./helpers";

test.describe("Registrazione e primo avvio", () => {
  test("dalla registrazione al link attivo", async ({ page }) => {
    const email = uniqueEmail("titolare");

    await page.goto("/registrati");
    await page.getByLabel("Nome e cognome").fill("Giulia Neri");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await expect(page.getByText("Ottima")).toBeVisible();
    await page.getByRole("button", { name: "Crea account" }).click();
    // senza spuntare i termini non si va avanti
    await expect(page.getByText("Conferma di aver letto i termini")).toBeVisible();
    await page.getByText("Accetto i").click();
    await page.getByRole("button", { name: "Crea account" }).click();

    await expect(page.getByRole("heading", { name: "Controlla la tua email" })).toBeVisible();
    await expect(visibleText(page, email)).toBeVisible();

    // un codice sbagliato non entra
    await typeCode(page, "000000");
    await expect(page.getByText("Codice non corretto. Controlla l’email e riprova.")).toBeVisible();

    // quello giusto si conferma da solo all'ultima cifra
    await page.reload();
    await typeCode(page, await codeFor(email));
    await expect(page).toHaveURL(/\/primo-avvio\/1$/);

    await completeOnboarding(page, "Barberia Prova");
    await expect(page.getByText(/Prova gratuita attiva fino al \d+ \w+\./)).toBeVisible();

    // nel database: salone in prova di 15 giorni, titolare e orari predefiniti
    const [salon] = await adminSelect<{ id: string; name: string; slug: string; onboarding_step: number; plan: string; trial_days: number }>(
      "salons",
      `select=id,name,slug,onboarding_step,plan&name=eq.Barberia%20Prova&order=created_at.desc&limit=1`,
    );
    expect(salon).toMatchObject({ name: "Barberia Prova", onboarding_step: 5, plan: "trial" });
    expect(salon!.slug).toMatch(/^barberia-prova(-\d+)?$/);
    const members = await adminSelect<{ name: string; role: string }>("members", `select=name,role&salon_id=eq.${salon!.id}`);
    expect(members).toEqual([{ name: "Giulia Neri", role: "owner" }]);
    const services = await adminSelect("services", `select=name&salon_id=eq.${salon!.id}`);
    expect(services).toHaveLength(5); // "Taglio lungo" era spento
  });

  test("non si salta un passo del primo avvio", async ({ page }) => {
    const email = uniqueEmail("salto");
    await createVerifiedUser(email);
    await signIn(page, email);
    await page.goto("/primo-avvio/3");
    await expect(page).toHaveURL(/\/primo-avvio\/1$/);
    await page.goto("/agenda");
    await expect(page).toHaveURL(/\/primo-avvio\/1$/);
  });

  test("password troppo corta e email non valida", async ({ page }) => {
    await page.goto("/registrati");
    await page.getByLabel("Email").fill("non-una-email");
    await page.getByLabel("Nome e cognome").click(); // esce dal campo
    await expect(page.getByText("Controlla l’indirizzo email.")).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("corta");
    await page.getByLabel("Nome e cognome").fill("Giulia Neri");
    await page.getByLabel("Email").fill(uniqueEmail("corta"));
    await page.getByText("Accetto i").click();
    await page.getByRole("button", { name: "Crea account" }).click();
    await expect(page.getByText("Servono almeno 8 caratteri.")).toBeVisible();
  });
});
