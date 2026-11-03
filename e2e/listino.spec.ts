import { expect, test } from "@playwright/test";
import { bookNewClient, dialog, freshOwner, nextOpenDay, openAppointment } from "./agenda-helpers";
import { adminSelect, signIn, visibleText } from "./helpers";

const DEMO = "taglendo-demo";
const text = (page: import("@playwright/test").Page, t: string | RegExp) => page.getByText(t).filter({ visible: true }).first();

test.describe("Listino e orari", () => {
  test("modificare, aggiungere e togliere servizi", async ({ page }) => {
    await freshOwner(page, "Barberia Listino");
    await page.goto("/listino");
    await expect(page.getByRole("heading", { level: 1, name: "Listino e orari" })).toBeVisible();
    await expect(text(page, "5 servizi")).toBeVisible();

    // cambia il prezzo di "Taglio uomo"
    await page.getByRole("button", { name: "Modifica: Taglio uomo" }).click();
    await dialog(page).getByLabel("Prezzo (€)").fill("22,50");
    await dialog(page).getByRole("button", { name: "Salva servizio" }).click();
    await expect(page.getByText("Servizio aggiornato").filter({ visible: true })).toBeVisible();
    await expect(text(page, "30 min · 22,50 €")).toBeVisible();

    // aggiunge un servizio
    await page.getByRole("button", { name: "+ Aggiungi servizio" }).click();
    await dialog(page).getByLabel("Nome del servizio").fill("Colore");
    await dialog(page).getByRole("button", { name: "1 h", exact: true }).click();
    await dialog(page).getByLabel("Prezzo (€)").fill("40");
    await dialog(page).getByRole("button", { name: "Salva servizio" }).click();
    await expect(page.getByText("Servizio aggiunto").filter({ visible: true })).toBeVisible();
    await expect(text(page, "6 servizi")).toBeVisible();
    await expect(text(page, "60 min · 40 €")).toBeVisible();

    // toglie "Barba": non si cancella, si nasconde
    await page.getByRole("button", { name: "Modifica: Barba" }).click();
    await dialog(page).getByRole("button", { name: "Togli dal listino" }).click();
    await expect(page.getByText("Servizio tolto dal listino").filter({ visible: true })).toBeVisible();
    await expect(text(page, "5 servizi")).toBeVisible();
    const rows = await adminSelect<{ active: boolean; price_cents: number }>("services", "select=active,price_cents&name=eq.Barba&active=eq.false");
    expect(rows.length).toBeGreaterThanOrEqual(1); // il servizio c'è ancora, solo nascosto
  });

  test("cambiare giorni, orari e pausa", async ({ page }) => {
    await freshOwner(page, "Barberia Orari");
    await page.goto("/listino");

    await page.getByRole("button", { name: "Lunedì, chiuso" }).click(); // apre il lunedì
    await page.getByRole("button", { name: "Apre alle prima" }).click(); // 9:00 → 8:30
    await page.getByRole("button", { name: "Chiude alle prima" }).click(); // 19:00 → 18:30
    await expect(text(page, "Nuovo orario: 8:30–18:30, pausa 13:00–14:30. Agenda e link si aggiornano quando salvi.")).toBeVisible();
    await page.getByRole("button", { name: /Pausa pranzo: No/ }).click();
    await expect(text(page, "Nuovo orario: 8:30–18:30, orario continuato. Agenda e link si aggiornano quando salvi.")).toBeVisible();

    await page.getByRole("button", { name: "Salva orari" }).click();
    await expect(page.getByText("Orari salvati").filter({ visible: true })).toBeVisible();

    const rows = await adminSelect<{ weekday: number; closed: boolean; open_min: number | null; close_min: number | null; break_start_min: number | null }>(
      "opening_hours",
      "select=weekday,closed,open_min,close_min,break_start_min&order=weekday",
    );
    // il salone nuovo è l'unico con 8:30–18:30 senza pausa
    const monday = rows.filter((r) => r.weekday === 1 && r.open_min === 510 && r.close_min === 1110);
    expect(monday.length).toBeGreaterThanOrEqual(1);
    expect(monday.every((r) => !r.closed && r.break_start_min === null)).toBe(true);

    // ricaricando i valori restano
    await page.reload();
    await expect(page.getByRole("button", { name: "Lunedì" })).toHaveAttribute("aria-pressed", "true");
  });

  test("gli appuntamenti fuori dal nuovo orario si segnalano, non si toccano", async ({ page }) => {
    const day = nextOpenDay();
    await freshOwner(page, "Barberia Fuori Orario");
    await page.goto(`/agenda?g=${day}`);
    await bookNewClient(page, "Mario Verdi", day, "09:00");
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();

    await page.goto("/listino");
    for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Apre alle dopo" }).click(); // 9:00 → 10:00
    await page.getByRole("button", { name: "Salva orari" }).click();
    await expect(page.getByText("Agenda e link usano i nuovi orari · 1 appuntamento fuori orario da controllare").filter({ visible: true })).toBeVisible();

    // l'appuntamento è ancora lì
    await page.goto(`/agenda?g=${day}`);
    await openAppointment(page, "Mario Verdi");
    await expect(dialog(page)).toContainText("09:00");
  });

  test("un barbiere vede listino e orari ma non li modifica", async ({ page }) => {
    await signIn(page, "marco@barberia-saragozza.example", DEMO);
    await page.goto("/listino");
    await expect(text(page, "Per cambiarle chiedi ad Andrea.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Modifica/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Aggiungi servizio" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Lunedì, chiuso" })).toBeDisabled();
  });
});

test.describe("Ferie e chiusure", () => {
  test("una chiusura avvisa degli appuntamenti, chiude il giorno e si può togliere", async ({ page }) => {
    const day = nextOpenDay();
    await freshOwner(page, "Barberia Chiusure");
    await page.goto(`/agenda?g=${day}`);
    await bookNewClient(page, "Mario Verdi", day, "10:00");
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();

    await page.goto("/listino/chiusure");
    await expect(text(page, "Nessuna chiusura in programma.")).toBeVisible();
    await page.getByRole("button", { name: "+ Aggiungi una chiusura" }).click();
    await dialog(page).getByLabel("Dal", { exact: true }).fill(day);
    await dialog(page).getByLabel("Al", { exact: true }).fill(day);
    await dialog(page).getByLabel(/^Nota/).fill("Corso di aggiornamento");
    await expect(dialog(page).getByText("1 appuntamento in questi giorni")).toBeVisible();
    await expect(dialog(page).getByText(/Mario Verdi\. Dopo il salvataggio ti aiutiamo ad avvisarli su WhatsApp\./)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Salva chiusura" }).click();

    // l'aiuto per avvisare i clienti (il cliente non ha il telefono)
    await expect(dialog(page).getByText("Avvisa i clienti")).toBeVisible();
    await expect(dialog(page).getByText("Mario Verdi")).toBeVisible();
    await expect(dialog(page).getByText("Nessun telefono")).toBeVisible();
    await dialog(page).getByRole("button", { name: "Fatto" }).click();
    await expect(page.getByText("Chiusura salvata").filter({ visible: true })).toBeVisible();
    await expect(text(page, "Corso di aggiornamento")).toBeVisible();

    // quel giorno in agenda è chiuso, ma l'appuntamento resta visibile da spostare
    await page.goto(`/agenda?g=${day}`);
    await expect(visibleText(page, /: salone chiuso · 1 appuntamento da spostare$/)).toBeVisible();
    await expect(visibleText(page, "Mario Verdi")).toBeVisible();

    // si toglie
    await page.goto("/listino/chiusure");
    await page.getByRole("button", { name: /Corso di aggiornamento/ }).click();
    await dialog(page).getByRole("button", { name: "Elimina chiusura" }).click();
    await expect(page.getByText("Chiusura eliminata").filter({ visible: true })).toBeVisible();
    await page.goto(`/agenda?g=${day}`);
    await expect(visibleText(page, "Mario Verdi")).toBeVisible();
  });

  test("un barbiere vede le chiusure ma non le cambia", async ({ page }) => {
    await signIn(page, "marco@barberia-saragozza.example", DEMO);
    await page.goto("/listino/chiusure");
    await expect(page.getByRole("heading", { level: 1, name: "Ferie e chiusure" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Aggiungi una chiusura" })).toHaveCount(0);
  });
});

test.describe("Impostazioni", () => {
  test("l'indice porta alle sezioni e non mostra l'abbonamento nella beta gratuita", async ({ page }) => {
    await signIn(page, "andrea@barberia-saragozza.example", DEMO);
    await page.goto("/impostazioni");
    await expect(page.getByRole("heading", { level: 1, name: "Impostazioni" })).toBeVisible();
    for (const label of ["Listino e orari", "Operatori", "Regole di prenotazione", "Email automatiche ai clienti", "Pagina del salone", "Avvisi"]) {
      await expect(page.getByRole("main").getByRole("link", { name: new RegExp(label) })).toBeVisible();
    }
    await expect(page.getByRole("main").getByRole("link", { name: /Abbonamento/ })).toHaveCount(0);
    await page.getByRole("main").getByRole("link", { name: /Operatori/ }).click();
    await expect(page).toHaveURL(/\/impostazioni\/operatori$/);
  });

  test("un barbiere vede 'Solo titolare' e può uscire", async ({ page }) => {
    await signIn(page, "marco@barberia-saragozza.example", DEMO);
    await page.goto("/impostazioni");
    await expect(page.getByText("Solo titolare").first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /Operatori/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Esci da Taglendo" }).click();
    await expect(page).toHaveURL(/\/accedi/);
  });
});

