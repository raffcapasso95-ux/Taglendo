import { expect, test, type Browser, type Page } from "@playwright/test";
import { bookNewClient, dialog, freshOwner, newButton, nextOpenDay, openAppointment, pickDayAndTime, pickTime, romeNow, weekday } from "./agenda-helpers";
import { adminSelect, adminUpdate, seedDay, signIn, visibleText } from "./helpers";

const SALON = "5a100000-0000-4000-8000-000000000001";

test.describe("Appuntamenti", () => {
  test("fissare, cambiare stato, spostare e annullare", async ({ page }) => {
    const day = nextOpenDay();
    await freshOwner(page, "Barberia Appuntamenti");
    await page.goto(`/agenda?g=${day}`);

    // fissa per un cliente nuovo
    await bookNewClient(page, "Mario Verdi", day, "10:00");
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();
    await expect(visibleText(page, "Mario Verdi")).toBeVisible();

    // il database ha copiato nome e prezzo del servizio e generato il codice
    const rows = await adminSelect<{ service_name: string; price_cents: number; public_code: string; status: string; source: string }>(
      "appointments",
      "select=service_name,price_cents,public_code,status,source&order=created_at.desc&limit=1",
    );
    expect(rows[0]).toMatchObject({ service_name: "Taglio uomo", price_cents: 2000, status: "confermato", source: "manuale" });
    expect(rows[0]!.public_code).toMatch(/^TG-\d{4}$/);

    // stato: completato, poi non presentato
    await openAppointment(page, "Mario Verdi");
    await dialog(page).getByRole("button", { name: "Completato" }).click();
    await expect(page.getByText("Segnato come completato").filter({ visible: true })).toBeVisible();
    await openAppointment(page, "Mario Verdi");
    await dialog(page).getByRole("button", { name: "Non presentato" }).click();
    await expect(page.getByText("Segnato come non presentato").filter({ visible: true })).toBeVisible();
    await openAppointment(page, "Mario Verdi");
    await dialog(page).getByRole("button", { name: "Confermato" }).click();
    await expect(page.getByText("Appuntamento confermato").filter({ visible: true })).toBeVisible();

    // sposta alle 11:00
    await openAppointment(page, "Mario Verdi");
    await dialog(page).getByRole("button", { name: "Sposta" }).click();
    await pickTime(page, "11:00");
    await expect(dialog(page).getByText(/Nuovo orario: .*11:00/)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Conferma" }).click();
    await expect(page.getByText("Appuntamento spostato").filter({ visible: true })).toBeVisible();
    const moved = await adminSelect<{ starts_at: string }>("appointments", "select=starts_at&order=created_at.desc&limit=1");
    expect(new Date(moved[0]!.starts_at).toISOString().slice(11, 16)).toMatch(/^(09|10):00$/); // 11:00 a Roma = 10:00 o 09:00 UTC

    // annulla, con la conferma
    await openAppointment(page, "Mario Verdi");
    await dialog(page).getByRole("button", { name: "Annulla", exact: true }).click();
    await expect(dialog(page).getByText("Annullare l’appuntamento di Mario? L’orario torna libero anche sul link.")).toBeVisible();
    await dialog(page).getByRole("button", { name: "No, tienilo" }).click(); // torna al dettaglio
    await expect(dialog(page).getByRole("button", { name: "Sposta" })).toBeVisible();
    await dialog(page).getByRole("button", { name: "Annulla", exact: true }).click();
    await dialog(page).getByRole("button", { name: "Sì, annulla" }).click();
    await expect(page.getByText("Appuntamento annullato").filter({ visible: true })).toBeVisible();
    await expect(visibleText(page, /1 annullato · mostra/)).toBeVisible();
    const cancelled = await adminSelect<{ status: string; cancelled_by: string }>("appointments", "select=status,cancelled_by&order=created_at.desc&limit=1");
    expect(cancelled[0]).toEqual({ status: "annullato", cancelled_by: "salone" });
  });

  test("lo stesso orario preso da due persone: vince il primo, il secondo vede le alternative", async ({ page, browser }) => {
    const day = nextOpenDay();
    await freshOwner(page, "Barberia Conteso");
    await page.goto(`/agenda?g=${day}`);

    // il secondo schermo (stesso salone) sceglie le 10:00 ma non salva ancora
    const second = await secondScreen(browser, page);
    await newButton(second).click();
    await dialog(second).getByRole("button", { name: "+ Nuovo cliente" }).click();
    await dialog(second).getByLabel("Nome").fill("Anna Bianchi");
    await pickDayAndTime(second, day, "10:00");

    // il primo schermo salva le 10:00
    await bookNewClient(page, "Luigi Neri", day, "10:00");
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();

    // il secondo prova a salvare le stesse 10:00
    await dialog(second).getByRole("button", { name: "Fissa l’appuntamento" }).click();
    await expect(dialog(second).getByText("Orario appena prenotato")).toBeVisible();
    await expect(dialog(second).getByText(/Le 10:00 non sono più libere\. Ti proponiamo le \d{2}:\d{2}\./)).toBeVisible();
    // una proposta e si fissa
    await dialog(second).getByRole("alert").getByRole("button").first().click();
    await dialog(second).getByRole("button", { name: "Fissa l’appuntamento" }).click();
    await expect(second.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();

    // nel database i due appuntamenti hanno orari diversi (lo stesso barbiere non è in due posti)
    const times = async (name: string) => {
      const clients = await adminSelect<{ id: string }>("clients", `select=id&name=eq.${encodeURIComponent(name)}`);
      const rows = await adminSelect<{ starts_at: string }>("appointments", `select=starts_at&client_id=eq.${clients[0]!.id}&status=eq.confermato`);
      return rows.map((r) => r.starts_at);
    };
    const [luigi, anna] = [await times("Luigi Neri"), await times("Anna Bianchi")];
    expect(luigi).toHaveLength(1);
    expect(anna).toHaveLength(1);
    expect(luigi[0]).not.toBe(anna[0]);
    await second.context().close();
  });

  test("«Cliente in negozio»: parte adesso se c'è posto, altrimenti lo dice", async ({ page }) => {
    await freshOwner(page, "Barberia Negozio");
    await page.goto("/agenda");
    await page.getByRole("button", { name: /^(Cliente in negozio|In negozio ora)$/ }).filter({ visible: true }).click();
    await dialog(page).getByRole("button", { name: "+ Nuovo cliente" }).click();
    await dialog(page).getByLabel("Nome").fill("Ragazzo con lo zaino rosso");
    await dialog(page).getByRole("button", { name: "Fissa l’appuntamento" }).click();

    // mar–sab, 9–19, pausa 13–14:30; il servizio proposto dura 30 minuti.
    // C'è posto finché un servizio entra prima della chiusura: prima dell'apertura o in pausa parte al primo orario libero.
    const { date, minutes } = romeNow();
    const open = weekday(date) >= 2;
    const room = open && minutes + 30 <= 1140;
    if (room) {
      await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();
      const rows = await adminSelect<{ source: string }>("appointments", "select=source&order=created_at.desc&limit=1");
      expect(rows[0]!.source).toBe("in_negozio");
    } else {
      await expect(dialog(page).getByText("Oggi non c’è spazio per questo servizio.")).toBeVisible();
    }
  });

  test("senza il permesso di fissare, il barbiere vede ma non modifica", async ({ page }) => {
    const { date: day, byOperator } = await seedDay();
    try {
      await adminUpdate("salons", `id=eq.${SALON}`, { barbers_edit: false });
      await signIn(page, "marco@barberia-saragozza.example", "taglendo-demo");
      await page.goto(`/agenda?g=${day}`);
      await expect(newButton(page)).toHaveCount(0);
      await expect(page.getByRole("button", { name: /^(Cliente in negozio|In negozio ora)$/ }).filter({ visible: true })).toHaveCount(0);
      await openAppointment(page, byOperator["Marco"]![0]!);
      await expect(dialog(page).getByText("Puoi vedere questo appuntamento, ma non modificarlo.")).toBeVisible();
      await expect(dialog(page).getByRole("button", { name: "Sposta" })).toHaveCount(0);
    } finally {
      await adminUpdate("salons", `id=eq.${SALON}`, { barbers_edit: true });
    }
  });
});

/** Un secondo schermo con lo stesso accesso (un'altra sessione del browser). */
async function secondScreen(browser: Browser, first: Page) {
  const context = await browser.newContext({ storageState: await first.context().storageState(), viewport: first.viewportSize() ?? undefined });
  const page = await context.newPage();
  await page.goto(first.url());
  return page;
}
