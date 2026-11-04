import { expect, test } from "@playwright/test";
import { freshOwner, dialog } from "./agenda-helpers";
import { adminSelect, codeFor, PASSWORD, signIn, uniqueEmail } from "./helpers";

test.describe("Profilo", () => {
  test("cambia il nome e lo ritrova nelle impostazioni", async ({ page }) => {
    await freshOwner(page, "Barberia Profilo Uno");
    await page.goto("/profilo");
    await expect(page.getByRole("heading", { name: "Profilo", exact: true })).toBeVisible();
    const save = page.getByRole("button", { name: "Salva", exact: true });
    await expect(save).toBeDisabled();
    await page.getByLabel("Nome e cognome").fill("Andrea Rossi");
    await save.click();
    await expect(page.getByText("Profilo salvato").filter({ visible: true })).toBeVisible();
    await page.goto("/impostazioni");
    await expect(page.getByText("Andrea Rossi").first()).toBeVisible();
  });

  test("cambia la password e accede con la nuova", async ({ page }) => {
    const email = await freshOwner(page, "Barberia Profilo Due");
    await page.goto("/profilo");
    await page.getByRole("button", { name: /^Password/ }).click();
    await dialog(page).getByLabel("Nuova password").fill("Nuova-pass9!");
    await dialog(page).getByLabel("Ripeti la password").fill("Diversa-pass9!");
    await dialog(page).getByRole("button", { name: "Salva la password" }).click();
    await expect(dialog(page).getByText("Le due password non coincidono.")).toBeVisible();
    await dialog(page).getByLabel("Ripeti la password").fill("Nuova-pass9!");
    await dialog(page).getByRole("button", { name: "Salva la password" }).click();
    await expect(page.getByText("Password cambiata").filter({ visible: true })).toBeVisible();
    await page.context().clearCookies();
    await signIn(page, email, "Nuova-pass9!");
    await expect(page).not.toHaveURL(/accedi/);
    expect(PASSWORD).not.toBe("Nuova-pass9!");
  });

  test("cambia l’email con il codice mandato al nuovo indirizzo", async ({ page }) => {
    await freshOwner(page, "Barberia Profilo Tre");
    const next = uniqueEmail("nuova");
    await page.goto("/profilo");
    await page.getByLabel("Email").fill(next);
    await page.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(dialog(page).getByText(next)).toBeVisible();
    await dialog(page).getByLabel("Codice").fill("000000");
    await dialog(page).getByRole("button", { name: "Conferma" }).click();
    await expect(dialog(page).getByText("Il codice non è corretto o è scaduto.")).toBeVisible();
    await dialog(page).getByLabel("Codice").fill(await codeFor(next));
    await dialog(page).getByRole("button", { name: "Conferma" }).click();
    await expect(page.getByText("Email cambiata").filter({ visible: true })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(next);
  });

  test("esporta i propri dati", async ({ page }) => {
    const email = await freshOwner(page, "Barberia Profilo Quattro");
    const res = await page.request.get("/profilo/esporta");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toContain("taglendo-i-miei-dati");
    const body = (await res.json()) as { account: { email: string }; saloni: Array<{ role: string }> };
    expect(body.account.email).toBe(email);
    expect(body.saloni[0]!.role).toBe("owner");
  });
});

test.describe("Elimina account", () => {
  test("serve scrivere ELIMINA; poi il salone è offline e non si rientra", async ({ page }) => {
    const SALON = `Barberia Eliminata ${Math.random().toString(36).slice(2, 6)}`;
    const email = await freshOwner(page, SALON);
    const [salon] = await adminSelect<{ id: string; slug: string }>("salons", `select=id,slug&name=eq.${SALON}&order=created_at.desc&limit=1`);
    await page.goto(`/${salon!.slug}`);
    await expect(page.getByRole("heading", { name: SALON }).first()).toBeVisible();

    await page.goto("/profilo");
    await page.getByRole("button", { name: "Elimina l’account" }).click();
    await expect(dialog(page).getByText("L’abbonamento viene disdetto subito.")).toBeVisible();
    await expect(dialog(page).getByText(`La pagina di ${SALON} va offline.`)).toBeVisible();
    const confirm = dialog(page).getByRole("button", { name: "Elimina definitivamente" });
    await expect(confirm).toBeDisabled();
    await dialog(page).getByLabel("Scrivi ELIMINA per confermare").fill("ELIM");
    await expect(confirm).toBeDisabled();
    await dialog(page).getByLabel("Scrivi ELIMINA per confermare").fill("ELIMINA");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page).toHaveURL(/\/(\?|$)/, { timeout: 15000 });

    const [after] = await adminSelect<{ deleted_at: string | null; booking_online: boolean }>("salons", `select=deleted_at,booking_online&id=eq.${salon!.id}`);
    expect(after!.deleted_at).not.toBeNull();
    expect(after!.booking_online).toBe(false);

    await page.goto(`/${salon!.slug}`);
    await expect(page.getByText(/non trovata|404|could not be found|non c’è/i).first()).toBeVisible();

    await signIn(page, email, undefined, { expectError: true });
    await expect(page).toHaveURL(/accedi/);
    await expect(page.getByRole("alert").first()).toBeVisible();
  });
});
