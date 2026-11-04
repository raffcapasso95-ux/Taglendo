import { expect, test, type Page } from "@playwright/test";
import { bookNewClient, dialog, freshOwner, nextOpenDay } from "./agenda-helpers";
import { adminSelect, adminUpdate, signIn, visibleText } from "./helpers";

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
    await expect(visibleText(page, /non trovata|404|Questa pagina non c’è/i)).toBeVisible();
  });
});

test.describe("Clienti · dati e privacy", () => {
  test("il titolare esporta un cliente e tutta la rubrica", async ({ page }) => {
    await owner(page);
    await page.goto("/clienti");
    const all = await page.request.get("/clienti/esporta");
    expect(all.status()).toBe(200);
    expect(all.headers()["content-type"]).toContain("text/csv");
    expect(all.headers()["content-disposition"]).toContain("attachment");
    const body = await all.text();
    expect(body.charCodeAt(0)).toBe(0xfeff);
    expect(body).toContain("Nome;Telefono;Email;Note");
    expect(body).toContain("Luca Rossi");

    await page.getByRole("link", { name: /^Luca Rossi/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Luca Rossi" })).toBeVisible();
    const href = await page.getByRole("link", { name: /Esporta i dati di Luca/ }).getAttribute("href");
    const one = await page.request.get(href!);
    expect(one.status()).toBe(200);
    expect(await one.text()).toContain("Data;Servizio;Barbiere;Prezzo (€);Stato");
  });

  test("un barbiere non vede le voci e non può scaricare", async ({ page }) => {
    await barber(page);
    await page.goto("/clienti");
    await page.getByRole("link", { name: /^Luca Rossi/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Luca Rossi" })).toBeVisible();
    await expect(page.getByText("Dati e privacy")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Esporta tutta la rubrica" })).toHaveCount(0);
    expect((await page.request.get("/clienti/esporta")).status()).toBe(403);
    expect((await page.request.get(page.url() + "/esporta")).status()).toBe(403);
  });

  test("eliminare un cliente: sparisce dalla rubrica e l'appuntamento futuro è annullato", async ({ page }) => {
    await freshOwner(page, "Barberia Privacy");
    const date = nextOpenDay();
    await page.goto(`/agenda?g=${date}`);
    await bookNewClient(page, "Giorgio Da Cancellare", date, "10:00");
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();

    await page.goto("/clienti");
    await page.getByRole("link", { name: /^Giorgio Da Cancellare/ }).click();
    await page.getByRole("button", { name: /Elimina cliente/ }).click();
    await expect(dialog(page).getByText("Eliminare Giorgio Da Cancellare?")).toBeVisible();
    await expect(dialog(page).getByText(/Gli incassi restano nei totali, senza nome/)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Annulla" }).click();
    await expect(dialog(page)).toHaveCount(0);

    await page.getByRole("button", { name: /Elimina cliente/ }).click();
    await dialog(page).getByRole("button", { name: "Elimina cliente" }).click();
    await expect(page).toHaveURL(/\/clienti$/);
    await expect(page.getByText("Cliente eliminato").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("La rubrica è ancora vuota").filter({ visible: true })).toBeVisible();

    const rows = await adminSelect<{ status: string; client_id: string | null }>("appointments", "select=status,client_id&service_name=neq.zz&order=created_at.desc&limit=1");
    expect(rows[0]).toMatchObject({ status: "annullato", client_id: null });
  });
});
