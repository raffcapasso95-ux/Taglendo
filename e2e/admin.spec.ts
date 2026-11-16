import { expect, test, type Page } from "@playwright/test";
import { adminInsert, adminSelect, env, PASSWORD, signIn, uniqueEmail } from "./helpers";
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
    // i giorni di prova che restano si leggono subito
    await expect(page.getByRole("img", { name: /giorni rimasti/ }).first()).toBeVisible();

    // nota
    await page.getByLabel("Nuova nota").fill("Contattato per l'avvio");
    await page.getByRole("button", { name: "Aggiungi la nota" }).click();
    await expect(page.getByText("Nota aggiunta.")).toBeVisible();
    await expect(page.getByText("Contattato per l'avvio")).toBeVisible();

    // sospensione in due passi, con il motivo
    await page.getByRole("button", { name: "Sospendi il salone" }).click();
    await page.getByRole("textbox", { name: "Motivo (lo vedi solo tu)" }).fill("Pagamento non arrivato");
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

  test("azioni veloci dal menu della riga e elenco delle utenze", async ({ page, browser }) => {
    const salon = `Barberia Rapida ${Date.now() % 100000}`;
    const ownerPage = await (await browser.newContext()).newPage();
    const owner = await freshOwner(ownerPage, salon);
    await adminIn(page, await createAdmin());

    await page.goto(`/admin/saloni?vista=tabella&q=${encodeURIComponent(salon)}`);
    const row = page.getByRole("row", { name: new RegExp(salon) });
    await row.getByRole("button", { name: `Azioni per ${salon}` }).click();
    await page.getByRole("menuitem", { name: "Nascondi dalla ricerca" }).click();
    await expect(page.getByText("Salone nascosto dalla ricerca.")).toBeVisible();
    await expect(row.getByText("Nascosto dalla ricerca")).toBeVisible();

    await row.getByRole("button", { name: `Azioni per ${salon}` }).click();
    await page.getByRole("menuitem", { name: "Prolunga la prova di 7 giorni" }).click();
    await expect(page.getByText("Prova prolungata di 7 giorni.")).toBeVisible();

    await row.getByRole("button", { name: `Azioni per ${salon}` }).click();
    await page.getByRole("menuitem", { name: "Sospendi…" }).click();
    await page.getByRole("textbox", { name: "Motivo (lo vedi solo tu)" }).fill("Prova");
    await page.getByRole("button", { name: "Conferma" }).click();
    await expect(page.getByText("Salone sospeso.")).toBeVisible();
    await expect(row.getByText("Sospeso", { exact: true }).first()).toBeVisible();

    // utenze: si trova il titolare, con il suo salone
    await page.goto(`/admin/utenze?vista=tabella&q=${encodeURIComponent(owner)}`);
    await expect(page.getByRole("heading", { name: "Utenze" })).toBeVisible();
    const u = page.getByRole("row", { name: new RegExp(salon) });
    await expect(u.getByText("Titolare")).toBeVisible();
    await expect(u.getByText(owner, { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Barbieri", exact: true }).click();
    await expect(page).toHaveURL(/stato=barber/);
    await expect(page.getByRole("link", { name: "Tabella" })).toHaveAttribute("aria-current", "true");
    await ownerPage.close();
  });

  test("utenze: amministratori del pannello, blocco dell'accesso, vista a schede", async ({ page, browser }) => {
    const salon = `Barberia Utenze ${Date.now() % 100000}`;
    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    const owner = await freshOwner(ownerPage, salon);
    const admin = await createAdmin();
    await adminIn(page, admin);

    // gli amministratori hanno la loro pagina, separata dalle utenze dei saloni
    await page.goto("/admin/amministratori");
    await expect(page.getByRole("heading", { name: "Amministratori", level: 1 })).toBeVisible();
    await expect(page.getByRole("article").filter({ hasText: admin })).toContainText("Tu");

    // si aggiunge un account che esiste, non uno che non esiste
    await page.getByRole("button", { name: "Aggiungi amministratore" }).click();
    await page.getByLabel("Email dell'account").fill("nessuno@example.com");
    await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
    await expect(page.getByText("Nessun account con questa email")).toBeVisible();
    await page.getByRole("button", { name: "Aggiungi amministratore" }).click();
    await page.getByLabel("Email dell'account").fill(owner);
    await page.getByRole("button", { name: "Aggiungi", exact: true }).click();
    await expect(page.getByText("Amministratore aggiunto.")).toBeVisible();
    const card = page.getByRole("article").filter({ hasText: owner });
    await expect(card).toBeVisible();

    // nelle utenze dei saloni lo stesso account è segnato come anche amministratore
    await page.goto(`/admin/utenze?q=${encodeURIComponent(owner)}`);
    await expect(page.getByRole("article").filter({ hasText: owner })).toContainText("Anche amministratore");

    // si toglie di nuovo
    await page.goto("/admin/amministratori");
    await page.getByRole("article").filter({ hasText: owner }).getByRole("button", { name: "Togli dagli amministratori" }).click();
    await page.getByRole("button", { name: "Conferma" }).click();
    await expect(page.getByText("Amministratore rimosso.")).toBeVisible();
    await expect(page.getByRole("article").filter({ hasText: owner })).toHaveCount(0);

    // utenze: schede di default, tabella a richiesta
    await page.goto(`/admin/utenze?q=${encodeURIComponent(owner)}`);
    await expect(page.getByRole("article").filter({ hasText: owner })).toBeVisible();
    await page.getByRole("link", { name: "Tabella" }).click();
    await expect(page).toHaveURL(/vista=tabella/);
    await page.getByRole("link", { name: "Schede" }).click();

    // blocco dell'accesso: il titolare non entra più
    await page.getByRole("article").filter({ hasText: owner }).getByRole("button", { name: /^Azioni per/ }).click();
    await page.getByRole("menuitem", { name: "Blocca l'accesso…" }).click();
    await page.getByRole("textbox", { name: "Motivo (lo vedi solo tu)" }).fill("Prova");
    await page.getByRole("button", { name: "Conferma" }).click();
    await expect(page.getByText("Accesso bloccato.")).toBeVisible();
    await ownerCtx.clearCookies();
    await signIn(ownerPage, owner, PASSWORD, { expectError: true });
    await expect(ownerPage).toHaveURL(/\/accedi/);
    await expect(ownerPage.getByRole("button", { name: "Accedi", exact: true })).toBeVisible();
    await ownerPage.close();
  });
});
