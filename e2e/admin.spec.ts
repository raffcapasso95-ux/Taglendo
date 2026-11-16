import { expect, test, type Page } from "@playwright/test";
import { adminInsert, adminSelect, env, PASSWORD, uniqueEmail } from "./helpers";
import { freshOwner } from "./agenda-helpers";

/** Crea l'utente del gestionale e lo mette fra gli amministratori (come farà il creatore). */
async function createAdmin(): Promise<string> {
  const email = uniqueEmail("admin");
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  });
  const user = (await res.json()) as { id: string };
  await adminInsert("platform_admins", { user_id: user.id, email });
  return email;
}

async function adminLogin(page: Page, email: string, password = PASSWORD) {
  await page.goto("/admin/accedi");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entra" }).click();
}

async function adminIn(page: Page, email: string) {
  await adminLogin(page, email);
  await page.waitForURL(/\/admin$/);
}

test.describe("Gestionale Taglendo", () => {
  test("senza accesso si finisce sulla pagina di accesso", async ({ page }) => {
    await page.goto("/admin/saloni");
    await expect(page).toHaveURL(/\/admin\/accedi$/);
    await expect(page.getByRole("heading", { name: "Gestionale Taglendo" })).toBeVisible();
  });

  test("un titolare non entra e non sa che l'area esiste; password sbagliata dà un errore generico", async ({ page }) => {
    const owner = await freshOwner(page, "Barberia Non Admin");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Questa pagina non c’è" })).toBeVisible();
    await page.context().clearCookies();
    await adminLogin(page, owner);
    await expect(page.getByText("Email o password non corrette.")).toBeVisible();
    await adminLogin(page, owner, "sbagliata");
    await expect(page.getByText("Email o password non corrette.")).toBeVisible();
  });

  test("panoramica, elenco con ricerca e scheda del salone; sospensione e riattivazione", async ({ page, browser }) => {
    const salon = `Barberia Gestionale ${Date.now() % 100000}`;
    const ownerPage = await (await browser.newContext()).newPage();
    const owner = await freshOwner(ownerPage, salon);
    const [row] = await adminSelect<{ id: string; slug: string }>("salons", `name=eq.${encodeURIComponent(salon)}&select=id,slug`);

    const admin = await createAdmin();
    await adminLogin(page, admin);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Panoramica" })).toBeVisible();

    // elenco: la ricerca trova il salone e mostra il titolare
    await page.getByRole("link", { name: "Saloni", exact: true }).first().click();
    await page.getByRole("searchbox", { name: "Cerca" }).fill(salon);
    await page.getByRole("button", { name: "Cerca", exact: true }).click();
    await expect(page.getByRole("link", { name: salon })).toBeVisible();
    await expect(page.getByText(owner)).toBeVisible();

    // scheda
    await page.getByRole("link", { name: salon }).click();
    await expect(page.getByRole("heading", { name: salon, level: 1 })).toBeVisible();
    await expect(page.getByText("I dati dei clienti del salone non si vedono da qui")).toBeVisible();

    // nota
    await page.getByLabel("Nuova nota").fill("Contattato per l'avvio");
    await page.getByRole("button", { name: "Aggiungi la nota" }).click();
    await expect(page.getByText("Nota aggiunta.")).toBeVisible();
    await expect(page.getByText("Contattato per l'avvio")).toBeVisible();

    // sospensione in due passi, con il motivo
    await page.getByLabel("Motivo (lo vedi solo tu)").fill("Pagamento non arrivato");
    await page.getByRole("button", { name: "Sospendi il salone" }).click();
    await page.getByRole("button", { name: "Conferma" }).click();
    await expect(page.getByText("Salone sospeso.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Riattiva il salone" })).toBeVisible();

    // il titolare vede l'avviso e non può aggiungere
    await ownerPage.goto("/agenda");
    await expect(ownerPage.getByText("Account sospeso", { exact: true })).toBeVisible();
    await expect(ownerPage.getByText(/contatta aiuto@taglendo\.it/i).first()).toBeVisible();
    await expect(ownerPage.getByRole("button", { name: /^\+ (Nuovo appuntamento|Appuntamento)$/ }).filter({ visible: true })).toHaveCount(0);

    // la pagina pubblica non c'è
    await ownerPage.goto(`/${row!.slug}`);
    await expect(ownerPage.getByRole("heading", { name: "Questa pagina non c’è" })).toBeVisible();

    // riattiva
    await page.getByRole("button", { name: "Riattiva il salone" }).click();
    await expect(page.getByText("Salone riattivato.")).toBeVisible();
    await ownerPage.goto("/agenda");
    await expect(ownerPage.getByText("Account sospeso", { exact: true })).toHaveCount(0);
    await ownerPage.goto(`/${row!.slug}`);
    await expect(ownerPage.getByRole("heading", { name: salon, level: 1 })).toBeVisible();
    await ownerPage.close();
  });

  test("nascondere dalla ricerca lascia la pagina aperta", async ({ page, browser }) => {
    const salon = `Barberia Nascosta ${Date.now() % 100000}`;
    const ownerPage = await (await browser.newContext()).newPage();
    await freshOwner(ownerPage, salon);
    const [row] = await adminSelect<{ id: string; slug: string }>("salons", `name=eq.${encodeURIComponent(salon)}&select=id,slug`);
    await adminIn(page, await createAdmin());
    await page.goto(`/admin/saloni/${row!.id}`);
    await page.getByRole("button", { name: "Nascondi dalla ricerca" }).click();
    await expect(page.getByText("Salone nascosto dalla ricerca.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mostra nella ricerca" })).toBeVisible();
    await ownerPage.goto(`/${row!.slug}`);
    await expect(ownerPage.getByRole("heading", { name: salon, level: 1 })).toBeVisible();
    await ownerPage.close();
  });
});
