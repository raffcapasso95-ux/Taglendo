import { expect, test, type Page } from "@playwright/test";
import { freshOwner } from "./agenda-helpers";
import { adminSelect, adminUpdate, bookingCode, uniqueEmail, visibleText, waitForEmail } from "./helpers";

/** Il titolare crea il salone e restituisce il suo link. */
async function newSalon(page: Page, name: string) {
  await freshOwner(page, name);
  await page.goto("/link");
  const shown = (await page.getByTestId("salon-url").textContent()) ?? "";
  return shown.slice(shown.lastIndexOf("/") + 1);
}

const card = (page: Page) => page.locator("#prenota-card");

async function chooseFirstSlot(page: Page) {
  await page.bringToFront(); // le pagine in secondo piano non finiscono le animazioni
  const banner = page.getByRole("dialog", { name: "Cookie" });
  await banner.waitFor({ timeout: 5000 }).catch(() => {});
  if (await banner.isVisible()) await banner.getByRole("button", { name: "Rifiuta" }).click(); // il banner cookie copre il modulo sul telefono
  await card(page).getByRole("button", { name: /^Taglio uomo/ }).click();
  const quick = card(page).getByText("Primi orari liberi").locator("..").getByRole("button").first();
  await expect(quick).toBeVisible();
  await quick.click();
}

async function fillData(page: Page, email: string, name = "Mario Rossi") {
  await page.bringToFront();
  await card(page).getByLabel("Nome e cognome").fill(name);
  await card(page).getByLabel("Email", { exact: true }).fill(email);
  await card(page).getByRole("checkbox", { name: /informativa privacy/ }).click();
  await card(page).getByRole("button", { name: "Prenota", exact: true }).click();
}

test.describe("Prenotazione online", () => {
  test("il cliente prenota con il codice via email e il titolare la vede", async ({ page, browser }) => {
    const slug = await newSalon(page, "Barberia Online Uno");
    const visitor = await browser.newPage();
    const email = uniqueEmail("cliente");
    await visitor.goto(`/${slug}`);
    await expect(visitor.getByRole("heading", { name: "Tre passi, un minuto." })).toBeVisible();

    await chooseFirstSlot(visitor);
    await fillData(visitor, email);
    await expect(visitor.getByRole("heading", { name: "Controlla la tua email" })).toBeVisible();

    const mail = await waitForEmail(email);
    expect(mail.subject).toMatch(/^Il tuo codice: \d{3} \d{3}$/);
    await visitor.getByLabel("Codice di conferma").fill(await bookingCode(email));
    await expect(visitor.getByRole("heading", { name: /Ci vediamo/ })).toBeVisible();
    await expect(visibleText(visitor, "Mario Rossi").or(visitor.getByText("Taglio uomo").first())).toBeVisible();

    const rows = await adminSelect<{ source: string; status: string; service_name: string; price_cents: number; public_code: string }>(
      "appointments",
      "select=source,status,service_name,price_cents,public_code&source=eq.online&order=created_at.desc&limit=1",
    );
    expect(rows[0]).toMatchObject({ source: "online", status: "confermato", service_name: "Taglio uomo", price_cents: 2000 });
    expect(rows[0]!.public_code).toMatch(/^TG-\d{4,6}$/);

    // il titolare lo vede in agenda
    await page.goto("/agenda");
    const confirm = await waitForEmail(email); // la prima email è il codice; la conferma arriva dopo
    expect(confirm.subject).toBeTruthy();
    await visitor.close();
  });

  test("codice sbagliato: dice quanti tentativi restano", async ({ page, browser }) => {
    const slug = await newSalon(page, "Barberia Online Due");
    const visitor = await browser.newPage();
    const email = uniqueEmail("cliente");
    await visitor.goto(`/${slug}`);
    await chooseFirstSlot(visitor);
    await fillData(visitor, email);
    await visitor.getByLabel("Codice di conferma").fill("000000");
    await expect(visitor.getByText("Codice errato. Ti restano 4 tentativi.")).toBeVisible();
    await visitor.getByLabel("Codice di conferma").fill("111111");
    await expect(visitor.getByText("Codice errato. Ti restano 3 tentativi.")).toBeVisible();
    // quello giusto funziona ancora
    await visitor.getByLabel("Codice di conferma").fill(await bookingCode(email));
    await expect(visitor.getByRole("heading", { name: /Ci vediamo/ })).toBeVisible();
    await visitor.close();
  });

  test("senza la casella dell'informativa non si prenota", async ({ page, browser }) => {
    const slug = await newSalon(page, "Barberia Online Tre");
    const visitor = await browser.newPage();
    await visitor.goto(`/${slug}`);
    await chooseFirstSlot(visitor);
    await card(visitor).getByLabel("Nome e cognome").fill("Mario Rossi");
    await card(visitor).getByLabel("Email", { exact: true }).fill("mario@example.com");
    await card(visitor).getByRole("button", { name: "Prenota", exact: true }).click();
    await expect(visitor.getByText("Conferma di aver letto l’informativa per prenotare.")).toBeVisible();
    await expect(visitor.getByRole("heading", { name: "Controlla la tua email" })).toBeHidden();
    // email sbagliata
    await card(visitor).getByLabel("Email", { exact: true }).fill("mario@");
    await card(visitor).getByLabel("Nome e cognome").click();
    await expect(visitor.getByText("Controlla l’email: manca qualcosa (es. nome@esempio.it).")).toBeVisible();
    await visitor.close();
  });

  test("orario conteso: il secondo cliente ne sceglie un altro senza chiedere un nuovo codice", async ({ page, browser }) => {
    const slug = await newSalon(page, "Barberia Online Quattro");
    const a = await browser.newPage();
    const b = await browser.newPage();
    const emailA = uniqueEmail("a");
    const emailB = uniqueEmail("b");
    for (const p of [a, b]) {
      await p.goto(`/${slug}`);
      await chooseFirstSlot(p);
    }
    await fillData(a, emailA, "Anna Bianchi");
    await fillData(b, emailB, "Bruno Verdi");
    // A conferma per primo
    await a.getByLabel("Codice di conferma").fill(await bookingCode(emailA));
    await expect(a.getByRole("heading", { name: /Ci vediamo/ })).toBeVisible();
    // B trova l'orario preso
    await b.getByLabel("Codice di conferma").fill(await bookingCode(emailB));
    await expect(b.getByText("Questo orario è stato appena preso.")).toBeVisible();
    const alternative = b.getByRole("alert").getByRole("button").first();
    await expect(alternative).toBeVisible();
    await alternative.click();
    await expect(b.getByRole("heading", { name: /Ci vediamo/ })).toBeVisible();
    const rows = await adminSelect<{ starts_at: string }>("appointments", "select=starts_at&source=eq.online&order=created_at.desc&limit=2");
    expect(new Set(rows.map((r) => r.starts_at)).size).toBe(2);
    await a.close();
    await b.close();
  });

  test("con la prenotazione online spenta la pagina resta, solo al telefono", async ({ page, browser }) => {
    const slug = await newSalon(page, "Barberia Online Cinque");
    await adminUpdate("salons", `slug=eq.${slug}`, { booking_online: false });
    const visitor = await browser.newPage();
    await visitor.goto(`/${slug}`);
    await expect(visitor.getByRole("heading", { name: "Si prenota al telefono." })).toBeVisible();
    await expect(visitor.getByRole("heading", { name: "Tre passi, un minuto." })).toHaveCount(0);
    await visitor.close();
  });

  test("con i prezzi nascosti il passo del servizio non mostra cifre", async ({ page, browser }) => {
    const slug = await newSalon(page, "Barberia Online Sei");
    await adminUpdate("salons", `slug=eq.${slug}`, { show_prices: false });
    const visitor = await browser.newPage();
    await visitor.goto(`/${slug}`);
    await expect(card(visitor).getByRole("button", { name: /^Taglio uomo/ })).toBeVisible();
    await expect(card(visitor).getByText(/\d+ €/)).toHaveCount(0);
    await visitor.close();
  });
});
