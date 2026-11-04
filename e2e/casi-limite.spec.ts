import { expect, test, type Page } from "@playwright/test";
import { freshOwner } from "./agenda-helpers";
import { adminInsert, adminSelect, adminUpdate, bookingCode, uniqueEmail } from "./helpers";

/** Casi limite di docs/06-casi-limite.md che si vedono solo nel browser. */

const card = (page: Page) => page.locator("#prenota-card");

async function newSalon(page: Page, name: string) {
  await freshOwner(page, name);
  await page.goto("/link");
  const shown = (await page.getByTestId("salon-url").textContent()) ?? "";
  return shown.slice(shown.lastIndexOf("/") + 1);
}

async function chooseFirstSlot(page: Page) {
  await page.bringToFront();
  const banner = page.getByRole("dialog", { name: "Cookie" });
  await banner.waitFor({ timeout: 5000 }).catch(() => {});
  if (await banner.isVisible()) await banner.getByRole("button", { name: "Rifiuta" }).click();
  await card(page).getByRole("button", { name: /^Taglio uomo/ }).click();
  const quick = card(page).getByText("Primi orari liberi").locator("..").getByRole("button").first();
  await expect(quick).toBeVisible();
  await quick.click();
}

async function fillData(page: Page, email: string) {
  await card(page).getByLabel("Nome e cognome").fill("Mario Rossi");
  await card(page).getByLabel("Email", { exact: true }).fill(email);
  await card(page).getByRole("checkbox", { name: /informativa privacy/ }).click();
  await card(page).getByRole("button", { name: "Prenota", exact: true }).click();
}

test.describe("Prenotazione del cliente: casi limite", () => {
  test("email non valida: l'errore compare all'uscita dal campo, non mentre si scrive", async ({ page, browser }) => {
    const slug = await newSalon(page, "Barberia Limite Uno");
    const visitor = await browser.newPage();
    await visitor.goto(`/${slug}`);
    await chooseFirstSlot(visitor);
    const field = card(visitor).getByLabel("Email", { exact: true });
    await field.click();
    await visitor.keyboard.type("mario@", { delay: 30 });
    await expect(card(visitor).getByText(/Controlla l’indirizzo|indirizzo email/i)).toHaveCount(0);
    await card(visitor).getByLabel("Nome e cognome").click(); // esce dal campo
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await visitor.close();
  });

  test("il salone passa a «solo telefono» mentre il cliente prenota: con il codice giusto lo dice, niente prenotazione", async ({ page, browser }) => {
    const slug = await newSalon(page, "Barberia Limite Due");
    const visitor = await browser.newPage();
    const email = uniqueEmail("cliente");
    await visitor.goto(`/${slug}`);
    await chooseFirstSlot(visitor);
    await fillData(visitor, email);
    await expect(visitor.getByRole("heading", { name: "Controlla la tua email" })).toBeVisible();
    await adminUpdate("salons", `slug=eq.${slug}`, { booking_online: false });
    await visitor.getByLabel("Codice di conferma").fill(await bookingCode(email));
    await expect(visitor.getByText("Le prenotazioni online sono in pausa. Per prenotare chiama il salone.")).toBeVisible();
    const rows = await adminSelect("appointments", `select=id&salon_id=eq.${(await adminSelect<{ id: string }>("salons", `select=id&slug=eq.${slug}`))[0]!.id}`);
    expect(rows).toHaveLength(0);
    await visitor.close();
  });

  test("errore di rete alla conferma del codice: «Errore di rete», poi riprova e funziona", async ({ page, browser }) => {
    const slug = await newSalon(page, "Barberia Limite Tre");
    const visitor = await browser.newPage();
    const email = uniqueEmail("cliente");
    await visitor.goto(`/${slug}`);
    await chooseFirstSlot(visitor);
    await fillData(visitor, email);
    await expect(visitor.getByRole("heading", { name: "Controlla la tua email" })).toBeVisible();
    const code = await bookingCode(email);
    await visitor.route("**/*", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
    await visitor.getByLabel("Codice di conferma").fill(code);
    await expect(visitor.getByText("Errore di rete. Controlla la connessione e riprova.")).toBeVisible();
    await visitor.unroute("**/*");
    await visitor.getByLabel("Codice di conferma").fill("");
    await visitor.getByLabel("Codice di conferma").fill(code);
    await expect(visitor.getByRole("heading", { name: /Ci vediamo/ })).toBeVisible();
    await visitor.close();
  });
});

test.describe("Dati estremi nel gestionale", () => {
  const LONG_EMAIL = `${"nome.molto.lungo".repeat(5)}@${"dominio-lunghissimo".repeat(2)}.example.com`; // > 80 caratteri
  const NOTE = "Nota molto lunga. ".repeat(40).slice(0, 500);

  async function overflow(page: Page) {
    return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  }

  test("nome lunghissimo, email da più di 80 caratteri e nota da 500 non rompono rubrica e scheda", async ({ page }) => {
    await freshOwner(page, "Barberia Dati Estremi");
    const [salon] = await adminSelect<{ id: string }>("salons", "select=id&name=eq.Barberia Dati Estremi&order=created_at.desc&limit=1");
    expect(LONG_EMAIL.length).toBeGreaterThan(80);
    await adminInsert("clients", { salon_id: salon!.id, name: "Giovanni Battista Della Valle-Santangelo", email: LONG_EMAIL, phone: "333 1234567", note: NOTE });
    await adminInsert("clients", { salon_id: salon!.id, name: "Jo" });
    await adminInsert("clients", { salon_id: salon!.id, name: "Ragazzo con lo zaino rosso" });

    await page.goto("/clienti");
    await expect(page.getByText("Giovanni Battista Della Valle-Santangelo").first()).toBeVisible();
    await expect(page.getByText("Jo", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Ragazzo con lo zaino rosso").first()).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);

    await page.getByText("Giovanni Battista Della Valle-Santangelo").first().click();
    await expect(page.getByRole("heading", { name: /Giovanni Battista/ }).first()).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("rubrica vuota: lo dice, senza errori", async ({ page }) => {
    await freshOwner(page, "Barberia Rubrica Vuota");
    await page.goto("/clienti");
    await expect(page.getByText("La rubrica è ancora vuota").first()).toBeVisible();
  });
});
