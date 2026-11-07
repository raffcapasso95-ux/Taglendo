import { expect, test, type Browser, type Page } from "@playwright/test";
import { freshOwner, dialog, openAppointment } from "./agenda-helpers";
import { adminSelect, adminUpdate, bookingCode, countMail, signIn, uniqueEmail, visibleText, waitForMail } from "./helpers";

const CRON = "Bearer local-cron-secret";
const card = (page: Page) => page.locator("#prenota-card");

async function newSalon(page: Page, name: string) {
  const owner = await freshOwner(page, name);
  await page.goto("/link");
  const shown = (await page.getByTestId("salon-url").textContent()) ?? "";
  return { owner, slug: shown.slice(shown.lastIndexOf("/") + 1) };
}

/** Il cliente prenota il primo orario libero; restituisce il suo indirizzo e il link di gestione. */
async function bookOnline(browser: Browser, slug: string, name = "Luca Bianchi") {
  const visitor = await browser.newPage();
  const email = uniqueEmail("cliente");
  await visitor.goto(`/${slug}`);
  const banner = visitor.getByRole("dialog", { name: "Cookie" });
  await banner.waitFor({ timeout: 5000 }).catch(() => {});
  if (await banner.isVisible()) await banner.getByRole("button", { name: "Rifiuta" }).click();
  await card(visitor).getByRole("button", { name: /^Taglio uomo/ }).click();
  const quick = card(visitor).getByRole("button", { name: /Prima disponibilità/ });
  await expect(quick).toBeVisible();
  await quick.click();
  await card(visitor).getByLabel("Nome e cognome").fill(name);
  await card(visitor).getByLabel("Email", { exact: true }).fill(email);
  await card(visitor).getByRole("checkbox", { name: /informativa privacy/ }).click();
  await card(visitor).getByRole("button", { name: /^Prenota · / }).click();
  await visitor.getByLabel("Codice di conferma").fill(await bookingCode(email));
  await expect(visitor.getByRole("heading", { name: /Ci vediamo/ })).toBeVisible();
  const { html } = await waitForMail(email, /^Confermato:/);
  const link = /href="([^"]*\/prenotazione\/[0-9a-f]{64})"/.exec(html)![1]!;
  return { visitor, email, path: new globalThis.URL(link).pathname };
}

const romeDay = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date(iso));

test.describe("Email e avvisi", () => {
  test("il titolare sceglie quali email partono e vede le anteprime", async ({ page }) => {
    await freshOwner(page, "Barberia Email Uno");
    await page.goto("/impostazioni/email");
    await expect(page.getByRole("heading", { level: 1, name: "Email ai clienti" })).toBeVisible();
    await expect(visibleText(page, "Sempre attiva: verifica l’email del cliente")).toBeVisible();
    await page.getByRole("switch", { name: /Promemoria/ }).click();
    await page.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(page.getByText("Email salvate").filter({ visible: true })).toBeVisible();
    const rows = await adminSelect<{ reminder: boolean; confirmation: boolean }>("email_prefs", "select=reminder,confirmation&order=salon_id.desc&limit=200");
    expect(rows.some((r) => r.reminder === false && r.confirmation === true)).toBe(true);

    await page.getByRole("link", { name: /Vedi le anteprime/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Anteprime delle email" })).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(5);
    await expect(page.locator("iframe").first()).toHaveAttribute("srcdoc", /Conferma la prenotazione/);
  });

  test("un barbiere non gestisce le email del salone", async ({ page }) => {
    await signIn(page, "marco@barberia-saragozza.example", "taglendo-demo");
    await page.goto("/impostazioni/email");
    await expect(page).toHaveURL(/\/agenda/);
  });

  test("ognuno sceglie i propri avvisi", async ({ page }) => {
    await freshOwner(page, "Barberia Avvisi Uno");
    await page.goto("/impostazioni/avvisi");
    await expect(page.getByRole("heading", { level: 1, name: "Avvisi per te" })).toBeVisible();
    await page.getByRole("switch", { name: /Riepilogo della giornata/ }).click();
    await page.getByRole("group", { name: "Come avvisarti" }).getByRole("button", { name: "Email", exact: true }).click();
    await page.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(page.getByText("Avvisi salvati").filter({ visible: true })).toBeVisible();
    const rows = await adminSelect<{ channel: string; daily_summary: boolean }>("notification_prefs", "select=channel,daily_summary&channel=eq.email&daily_summary=eq.true&limit=5");
    expect(rows.length).toBeGreaterThan(0);
    await page.reload();
    await expect(page.getByRole("group", { name: "Come avvisarti" }).getByRole("button", { name: "Email", exact: true })).toHaveAttribute("aria-pressed", "true");
    // le notifiche sul dispositivo hanno la loro riga
    await expect(page.getByText("Notifiche su questo dispositivo")).toBeVisible();
  });

  test("nuova prenotazione e annullamento del cliente avvisano il titolare via email", async ({ page, browser }) => {
    const { owner, slug } = await newSalon(page, "Barberia Avvisi Due");
    const { visitor, path } = await bookOnline(browser, slug);
    // di default l'avviso è "notifica", ma nessun dispositivo è attivo: ripiega sull'email
    const mail = await waitForMail(owner, /^Nuova prenotazione: Luca Bianchi/);
    expect(mail.subject).toMatch(/Luca Bianchi · .* · Taglio uomo$/);
    await visitor.goto(path);
    await visitor.getByRole("button", { name: "Annulla la prenotazione" }).click();
    await visitor.getByRole("button", { name: "Sì, annulla" }).click();
    await expect(visitor.getByRole("heading", { name: "Appuntamento annullato" })).toBeVisible();
    const cancelled = await waitForMail(owner, /^Annullato dal cliente: Luca Bianchi/);
    expect(cancelled.subject).toContain("l’orario è di nuovo libero");
    await visitor.close();
  });

  test("se il titolare spegne l'avviso non riceve nulla", async ({ page, browser }) => {
    const { owner, slug } = await newSalon(page, "Barberia Avvisi Tre");
    await page.goto("/impostazioni/avvisi");
    await page.getByRole("switch", { name: /Nuova prenotazione online/ }).click();
    await page.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(page.getByText("Avvisi salvati").filter({ visible: true })).toBeVisible();
    const { visitor, email } = await bookOnline(browser, slug, "Giulia Neri");
    await waitForMail(email, /^Confermato:/); // la conferma al cliente c'è sempre
    await new Promise((r) => setTimeout(r, 1500));
    expect(await countMail(owner, /^Nuova prenotazione:/)).toBe(0);
    await visitor.close();
  });

  test("il promemoria parte una sola volta, il giorno prima", async ({ page, browser, request }) => {
    const { slug } = await newSalon(page, "Barberia Promemoria");
    const { visitor, email, path } = await bookOnline(browser, slug);
    const token = path.split("/").pop();
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    tomorrow.setUTCHours(12, 0, 0, 0);
    const end = new Date(tomorrow.getTime() + 30 * 60000);
    await adminUpdate("appointments", `manage_token=eq.${token}`, { starts_at: tomorrow.toISOString(), ends_at: end.toISOString() });

    expect((await request.get("/api/cron/run?job=reminders")).status()).toBe(401);
    expect((await request.get("/api/cron/run?job=reminders", { headers: { Authorization: "Bearer sbagliato" } })).status()).toBe(401);

    const first = await request.get("/api/cron/run?job=reminders", { headers: { Authorization: CRON } });
    expect(first.status()).toBe(200);
    const mail = await waitForMail(email, /^Domani alle \d{2}:\d{2} da Barberia Promemoria$/);
    expect(mail.html).toContain("A domani, Luca");
    expect(mail.html).toContain("Gestisci la prenotazione");
    // un secondo passaggio non manda un altro promemoria
    await request.get("/api/cron/run?job=reminders", { headers: { Authorization: CRON } });
    expect(await countMail(email, /^Domani alle/)).toBe(1);
    await visitor.close();
  });

  test("con il promemoria spento non parte", async ({ page, browser, request }) => {
    const { slug } = await newSalon(page, "Barberia Senza Promemoria");
    await page.goto("/impostazioni/email");
    await page.getByRole("switch", { name: /Promemoria/ }).click();
    await page.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(page.getByText("Email salvate").filter({ visible: true })).toBeVisible();
    const { visitor, email, path } = await bookOnline(browser, slug);
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    tomorrow.setUTCHours(12, 0, 0, 0);
    await adminUpdate("appointments", `manage_token=eq.${path.split("/").pop()}`, { starts_at: tomorrow.toISOString(), ends_at: new Date(tomorrow.getTime() + 30 * 60000).toISOString() });
    await request.get("/api/cron/run?job=reminders", { headers: { Authorization: CRON } });
    await new Promise((r) => setTimeout(r, 1500));
    expect(await countMail(email, /^Domani alle/)).toBe(0);
    await visitor.close();
  });

  test("il riepilogo delle 8:00 arriva a chi lo ha acceso", async ({ page, browser, request }) => {
    const { owner, slug } = await newSalon(page, "Barberia Riepilogo");
    await page.goto("/impostazioni/avvisi");
    await page.getByRole("switch", { name: /Riepilogo della giornata/ }).click();
    await page.getByRole("group", { name: "Come avvisarti" }).getByRole("button", { name: "Email", exact: true }).click();
    await page.getByRole("button", { name: "Salva", exact: true }).click();
    await expect(page.getByText("Avvisi salvati").filter({ visible: true })).toBeVisible();
    const { visitor, path } = await bookOnline(browser, slug);
    // porta l'appuntamento a oggi, a mezzogiorno di Roma circa
    const today = new Date();
    today.setUTCHours(10, 0, 0, 0);
    await adminUpdate("appointments", `manage_token=eq.${path.split("/").pop()}`, { starts_at: today.toISOString(), ends_at: new Date(today.getTime() + 30 * 60000).toISOString() });
    await request.get("/api/cron/run?job=summaries", { headers: { Authorization: CRON } });
    const mail = await waitForMail(owner, /^Oggi hai 1 appuntamento$/);
    expect(mail.html).toContain("Luca Bianchi");
    await request.get("/api/cron/run?job=summaries", { headers: { Authorization: CRON } });
    await new Promise((r) => setTimeout(r, 1000));
    expect(await countMail(owner, /^Oggi hai 1 appuntamento$/)).toBe(1); // una volta al giorno
    await visitor.close();
  });

  test("se il salone sposta o annulla, il cliente riceve l'email", async ({ page, browser }) => {
    const { slug } = await newSalon(page, "Barberia Sposta");
    const { visitor, email, path } = await bookOnline(browser, slug);
    const [appt] = await adminSelect<{ starts_at: string }>("appointments", `select=starts_at&manage_token=eq.${path.split("/").pop()}`);
    await page.goto(`/agenda?g=${romeDay(appt!.starts_at)}`);
    await openAppointment(page, "Luca Bianchi");
    await dialog(page).getByRole("button", { name: "Sposta" }).click();
    await dialog(page).getByRole("button", { name: /^\d{2}:\d{2}$/ }).and(page.locator(":not([disabled])")).last().click();
    await dialog(page).getByRole("button", { name: "Sposta", exact: true }).click();
    await expect(page.getByText("Appuntamento spostato").filter({ visible: true })).toBeVisible();
    const moved = await waitForMail(email, /^Nuovo orario: /);
    expect(moved.html).toContain("Il tuo appuntamento è stato spostato");

    await openAppointment(page, "Luca Bianchi");
    await dialog(page).getByRole("button", { name: "Annulla", exact: true }).click();
    await dialog(page).getByRole("button", { name: "Sì, annulla" }).click();
    await expect(page.getByText("Appuntamento annullato").filter({ visible: true })).toBeVisible();
    const cancelled = await waitForMail(email, /^Appuntamento annullato$/);
    expect(cancelled.html).toContain("Il salone ha annullato l’appuntamento");
    await visitor.close();
  });

  test("invitando un operatore parte l'email con il link", async ({ page }) => {
    await freshOwner(page, "Barberia Invito");
    await page.goto("/impostazioni/operatori");
    const barber = uniqueEmail("barbiere");
    await page.getByRole("button", { name: "+ Invita un operatore" }).first().click();
    await page.getByLabel("Nome del barbiere").fill("Marco Verdi");
    await page.getByLabel("Email del barbiere").fill(barber);
    await page.getByRole("button", { name: "Crea invito" }).click();
    const mail = await waitForMail(barber, /ti ha invitato su Taglendo$/);
    expect(mail.html).toContain("Ciao Marco, entra nell’agenda del salone");
    expect(mail.html).toMatch(/href="[^"]*\/invito\/[A-Za-z0-9_-]+"/);
    expect(mail.html).toContain("Il link vale 7 giorni");
  });

  test("l'app è installabile: manifest, icone e service worker", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.status()).toBe(200);
    const m = (await manifest.json()) as { name: string; display: string; start_url: string; icons: Array<{ src: string; sizes: string; purpose?: string }> };
    expect(m).toMatchObject({ name: "Taglendo", display: "standalone", start_url: "/agenda" });
    expect(m.icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable")).toBe(true);
    for (const icon of m.icons) expect((await request.get(icon.src)).status()).toBe(200);
    const sw = await request.get("/sw.js");
    expect(sw.status()).toBe(200);
    expect(sw.headers()["content-type"]).toMatch(/javascript/);
    expect(await sw.text()).toContain("showNotification");
  });
});

test("le chiavi delle notifiche sono coerenti", async ({ request }) => {
  const r = await request.get("/api/cron/run?job=none", { headers: { Authorization: CRON } });
  expect((await r.json()).push).toBe("ok");
});
