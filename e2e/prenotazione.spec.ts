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
  const first = card(page).getByRole("button", { name: /Prima disponibilità/ });
  await expect(first).toBeVisible();
  await first.click();
}

async function fillData(page: Page, email: string, name = "Mario Rossi") {
  await page.bringToFront();
  await card(page).getByLabel("Nome e cognome").fill(name);
  await card(page).getByLabel("Email", { exact: true }).fill(email);
  await card(page).getByRole("checkbox", { name: /informativa privacy/ }).click();
  await card(page).getByRole("button", { name: /^Prenota · / }).click();
}

test.describe("Prenotazione online", () => {
  test("il cliente prenota con il codice via email e il titolare la vede", async ({ page, browser }) => {
    const slug = await newSalon(page, "Barberia Online Uno");
    const visitor = await browser.newPage();
    const email = uniqueEmail("cliente");
    await visitor.goto(`/${slug}`);
    await expect(visitor.getByRole("heading", { name: "Prenota in un minuto." })).toBeVisible();

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
    await expect(visitor.getByText("Mancano: informativa privacy.")).toBeVisible();
    await card(visitor).getByRole("button", { name: /^Prenota · / }).click({ force: true }); // spento finché manca qualcosa: tocca lo stesso
    await expect(visitor.getByText("Mancano: informativa privacy.")).toBeVisible();
    await expect(visitor.getByRole("heading", { name: "Controlla la tua email" })).toBeHidden();
    // email sbagliata
    await card(visitor).getByLabel("Email", { exact: true }).fill("mario@");
    await expect(visitor.getByText("Mancano: email e informativa privacy.")).toBeVisible();
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
    await expect(visitor.getByRole("heading", { name: "Servizi e prezzi." })).toBeVisible();
    await expect(visitor.getByRole("heading", { name: "Prenota in un minuto." })).toHaveCount(0);
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

test.describe("Gestione della prenotazione dal link", () => {
  /** Prenota come cliente e restituisce il link di gestione dalla email di conferma. */
  async function bookAndGetLink(page: Page, browser: import("@playwright/test").Browser, salon: string) {
    const slug = await newSalon(page, salon);
    const visitor = await browser.newPage();
    const email = uniqueEmail("cliente");
    await visitor.goto(`/${slug}`);
    await chooseFirstSlot(visitor);
    await fillData(visitor, email, "Luca Bianchi");
    await visitor.getByLabel("Codice di conferma").fill(await bookingCode(email));
    await expect(visitor.getByRole("heading", { name: /Ci vediamo/ })).toBeVisible();
    const { html } = await waitForConfirmation(email);
    const link = /href="([^"]*\/prenotazione\/[0-9a-f]{64})"/.exec(html)?.[1];
    if (!link) throw new Error("Link di gestione non trovato nell'email");
    return { slug, email, visitor, path: new globalThis.URL(link).pathname };
  }

  async function waitForConfirmation(to: string) {
    for (let i = 0; i < 40; i++) {
      const list = (await (await fetch("http://127.0.0.1:54324/api/v1/messages?limit=100")).json()) as { messages: Array<{ ID: string; Subject: string; To: Array<{ Address: string }> }> };
      const found = list.messages.find((m) => m.Subject.startsWith("Confermato") && m.To.some((t) => t.Address === to));
      if (found) {
        const full = (await (await fetch(`http://127.0.0.1:54324/api/v1/message/${found.ID}`)).json()) as { HTML: string };
        return { html: full.HTML };
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`Nessuna conferma per ${to}`);
  }

  test("dal link si vede la prenotazione e si scarica il calendario", async ({ page, browser }) => {
    const { visitor, path } = await bookAndGetLink(page, browser, "Barberia Gestisci Uno");
    await visitor.goto(path);
    await expect(visitor.getByRole("heading", { name: "La tua prenotazione" })).toBeVisible();
    await expect(visitor.getByText(/^Prenotazione TG-\d{4,6}$/)).toBeVisible();
    await expect(visitor.getByText("Taglio uomo")).toBeVisible();
    await expect(visitor.getByText("Paghi in negozio")).toBeVisible();
    const res = await visitor.request.get(`${path}/calendario.ics`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    const ics = await res.text();
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Taglio uomo da Barberia Gestisci Uno");
    await visitor.close();
  });

  test("annulla con la doppia conferma: l'orario torna libero e arriva l'email", async ({ page, browser }) => {
    const { visitor, path, email } = await bookAndGetLink(page, browser, "Barberia Gestisci Due");
    await visitor.goto(path);
    await visitor.getByRole("button", { name: "Annulla la prenotazione" }).click();
    await expect(visitor.getByRole("heading", { name: "Annullare l’appuntamento?" })).toBeVisible();
    await visitor.getByRole("button", { name: "No, lo tengo" }).click();
    await expect(visitor.getByRole("heading", { name: "La tua prenotazione" })).toBeVisible();
    await visitor.getByRole("button", { name: "Annulla la prenotazione" }).click();
    await visitor.getByRole("button", { name: "Sì, annulla" }).click();
    await expect(visitor.getByRole("heading", { name: "Appuntamento annullato" })).toBeVisible();
    await expect(visitor.getByText(/Ti abbiamo mandato una conferma via email/)).toBeVisible();

    const rows = await adminSelect<{ status: string; cancelled_by: string }>("appointments", "select=status,cancelled_by&source=eq.online&order=created_at.desc&limit=1");
    expect(rows[0]).toEqual({ status: "annullato", cancelled_by: "cliente" });

    // F4 nella casella
    for (let i = 0; i < 40; i++) {
      const list = (await (await fetch("http://127.0.0.1:54324/api/v1/messages?limit=100")).json()) as { messages: Array<{ Subject: string; To: Array<{ Address: string }> }> };
      if (list.messages.some((m) => m.Subject === "Appuntamento annullato" && m.To.some((t) => t.Address === email))) break;
      if (i === 39) throw new Error("Email di annullamento non arrivata");
      await new Promise((r) => setTimeout(r, 250));
    }

    // da qui il link non vale più (E5)
    await visitor.goto(path);
    await expect(visitor.getByRole("heading", { name: "Questo link non funziona più" })).toBeVisible();
    await expect(visitor.getByRole("link", { name: "Vai alla pagina del salone" })).toBeVisible();
    await visitor.close();
  });

  test("troppo tardi: oltre il limite si chiama il salone, senza pulsante di annullamento", async ({ page, browser }) => {
    const { visitor, path } = await bookAndGetLink(page, browser, "Barberia Gestisci Tre");
    // l'appuntamento è tra poco più di 2 ore: si porta a 30 minuti da adesso
    const soon = new Date(Date.now() + 30 * 60000).toISOString();
    const end = new Date(Date.now() + 60 * 60000).toISOString();
    await adminUpdate("appointments", `manage_token=eq.${path.split("/").pop()}`, { starts_at: soon, ends_at: end });
    await visitor.goto(path);
    await expect(visitor.getByRole("heading", { name: "Non puoi più annullare online" })).toBeVisible();
    await expect(visitor.getByRole("button", { name: "Annulla la prenotazione" })).toHaveCount(0);
    await expect(visitor.getByRole("link", { name: /^Chiama / }).first()).toBeVisible();
    await visitor.close();
  });

  test("con l'annullamento online spento si chiama il salone", async ({ page, browser }) => {
    const { slug, visitor, path } = await bookAndGetLink(page, browser, "Barberia Gestisci Quattro");
    await adminUpdate("salons", `slug=eq.${slug}`, { cancel_online: false });
    await visitor.goto(path);
    await expect(visitor.getByText("Per annullare o spostare l’orario chiama il salone.")).toBeVisible();
    await expect(visitor.getByRole("button", { name: "Annulla la prenotazione" })).toHaveCount(0);
    await visitor.close();
  });

  test("un link inventato o di un altro salone mostra la pagina neutra", async ({ browser }) => {
    const visitor = await browser.newPage();
    await visitor.goto(`/barberia-saragozza/prenotazione/${"a".repeat(64)}`);
    await expect(visitor.getByRole("heading", { name: "Questo link non funziona più" })).toBeVisible();
    await visitor.goto("/barberia-saragozza/prenotazione/abc");
    await expect(visitor.getByRole("heading", { name: "Questo link non funziona più" })).toBeVisible();
    await visitor.close();
  });
});
