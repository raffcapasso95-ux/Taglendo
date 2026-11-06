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
    await expect(page.getByRole("button", { name: "Modifica: Taglio uomo" })).toContainText("22,50");

    // aggiunge un servizio
    await page.getByRole("button", { name: "+ Aggiungi servizio" }).click();
    await dialog(page).getByLabel("Nome del servizio").fill("Colore");
    await dialog(page).getByRole("button", { name: "1 h", exact: true }).click();
    await dialog(page).getByLabel("Prezzo (€)").fill("40");
    await dialog(page).getByRole("button", { name: "Salva servizio" }).click();
    await expect(page.getByText("Servizio aggiunto").filter({ visible: true })).toBeVisible();
    await expect(text(page, "6 servizi")).toBeVisible();
    await expect(page.getByRole("button", { name: "Modifica: Colore" })).toContainText("40");
    await expect(page.getByRole("button", { name: "Modifica: Colore" })).toContainText("60 min");

    // toglie "Barba": non si cancella, si nasconde
    await page.getByRole("button", { name: "Modifica: Barba" }).click();
    await dialog(page).getByRole("button", { name: "Togli dal listino" }).click();
    await expect(page.getByText("Servizio tolto dal listino").filter({ visible: true })).toBeVisible();
    await expect(text(page, "5 servizi")).toBeVisible();
    const rows = await adminSelect<{ active: boolean; price_cents: number }>("services", "select=active,price_cents&name=eq.Barba&active=eq.false");
    expect(rows.length).toBeGreaterThanOrEqual(1); // il servizio c'è ancora, solo nascosto
  });

  test("orari per giorno: il lunedì si apre dal foglio con le sue fasce e si copiano su un altro giorno", async ({ page }) => {
    await freshOwner(page, "Barberia Orari");
    await page.goto("/listino/orari");
    await expect(page.getByRole("heading", { level: 1, name: "Listino e orari" })).toBeVisible();
    await expect(text(page, /^Aperto 5 giorni · 43 h a settimana$/)).toBeVisible();

    await page.getByRole("button", { name: "Modifica orari di lunedì" }).click();
    const d = dialog(page);
    await expect(d.getByRole("heading", { name: "Lunedì", level: 2 })).toBeVisible();
    await d.getByRole("switch", { name: /Aperto il lunedì/ }).click(); // era chiuso
    await d.getByRole("button", { name: "Fascia 1 dalle prima" }).click(); // 9:00 → 8:45
    await d.getByRole("button", { name: /^Togli la fascia 14:30–19:00$/ }).click(); // una fascia sola
    await d.getByRole("button", { name: "Mar", exact: true }).click(); // vale anche per il martedì
    await d.getByRole("button", { name: "Salva" }).click();
    await expect(page.getByText("Orari salvati").filter({ visible: true })).toBeVisible();

    const ranges = await adminSelect<{ weekday: number; start_min: number; end_min: number }>("opening_ranges", "select=weekday,start_min,end_min&weekday=in.(1,2)&start_min=eq.525&order=weekday");
    // il salone nuovo è l'unico con 8:45–13:00 il lunedì e il martedì
    expect(ranges.filter((r) => r.weekday === 1 && r.end_min === 780).length).toBeGreaterThanOrEqual(1);
    expect(ranges.filter((r) => r.weekday === 2 && r.end_min === 780).length).toBeGreaterThanOrEqual(1);

    // ricaricando i valori restano
    await page.reload();
    await expect(page.getByRole("button", { name: "Modifica orari di lunedì" })).toContainText("8:45–13:00");
    await expect(page.getByRole("button", { name: "Modifica orari di martedì" })).toContainText("8:45–13:00");
    await expect(page.getByRole("button", { name: "Modifica orari di martedì" })).not.toContainText("14:30");
  });

  test("tre fasce in un giorno e l'interruttore chiude un giorno subito", async ({ page }) => {
    await freshOwner(page, "Barberia Tre Fasce");
    await page.goto("/listino/orari");
    await page.getByRole("button", { name: "Modifica orari di giovedì" }).click();
    await dialog(page).getByRole("button", { name: "+ Aggiungi una fascia" }).click();
    await expect(dialog(page).getByRole("listitem")).toHaveCount(3);
    await dialog(page).getByRole("button", { name: "Salva" }).click();
    await expect(page.getByText("Orari salvati").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Modifica orari di giovedì" }).locator("span").filter({ hasText: /\d+:\d\d–\d+:\d\d/ })).toHaveCount(3);

    // l'interruttore del giorno salva da solo
    await page.getByRole("switch", { name: "Martedì aperto" }).click();
    await expect(page.getByText("Orari salvati").filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Modifica orari di martedì" })).toContainText("Chiuso");
    await expect(page.getByRole("switch", { name: "Martedì aperto" })).toHaveAttribute("aria-checked", "false");
  });

  test("gli appuntamenti fuori dal nuovo orario si segnalano, non si toccano", async ({ page }) => {
    const day = nextOpenDay();
    await freshOwner(page, "Barberia Fuori Orario");
    await page.goto(`/agenda?g=${day}`);
    await bookNewClient(page, "Mario Verdi", day, "09:00");
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();

    await page.goto("/listino/orari");
    const name = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"][new Date(`${day}T12:00:00Z`).getUTCDay()]!;
    await page.getByRole("button", { name: `Modifica orari di ${name}` }).click();
    for (let i = 0; i < 4; i++) await dialog(page).getByRole("button", { name: "Fascia 1 dalle dopo" }).click(); // 9:00 → 10:00
    await dialog(page).getByRole("button", { name: "Salva" }).click();
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
    await expect(page.getByRole("button", { name: /^Modifica/ }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: "+ Aggiungi servizio" })).toHaveCount(0);
    await page.goto("/listino/orari");
    await expect(page.getByRole("button", { name: "Modifica orari di lunedì" })).toBeDisabled();
    await expect(page.getByRole("switch", { name: "Lunedì aperto" })).toBeDisabled();
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

