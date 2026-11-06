import { expect, test } from "@playwright/test";
import { adminUpdate, seedDay, signIn, visibleText } from "./helpers";

const ANDREA = "andrea@barberia-saragozza.example";
const MARCO = "marco@barberia-saragozza.example";
const DEMO_PASSWORD = "taglendo-demo";
const SALON = "5a100000-0000-4000-8000-000000000001";

test.describe("Agenda (sola lettura)", () => {
  test("il titolare vede la giornata con i tre barbieri e il riepilogo", async ({ page }) => {
    const { date, byOperator } = await seedDay();
    await signIn(page, ANDREA, DEMO_PASSWORD);
    await page.goto(`/agenda?g=${date}`);

    await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toContainText(/\d{1,2} \w+/);
    await expect(visibleText(page, /^\d+ client[ei] · .+ libere$/)).toBeVisible();
    // ogni cliente del giorno compare
    for (const names of Object.values(byOperator)) await expect(visibleText(page, names[0]!)).toBeVisible();

    // il filtro per barbiere: sceglie un barbiere e gli altri spariscono
    const operators = Object.keys(byOperator);
    expect(operators.length).toBeGreaterThanOrEqual(2);
    const [chosen, other] = operators as [string, string];
    const filter = page.getByRole("navigation", { name: "Barbieri" });
    await expect(filter.getByRole("link", { name: "Tutti" })).toHaveAttribute("aria-current", "true");
    await filter.getByRole("link", { name: chosen }).click();
    await expect(page).toHaveURL(/op=/);
    await expect(visibleText(page, byOperator[chosen]![0]!)).toBeVisible();
    await expect(page.getByText(byOperator[other]![0]!).filter({ visible: true })).toHaveCount(0);
  });

  test("un giorno chiuso lo dice", async ({ page }) => {
    await signIn(page, ANDREA, DEMO_PASSWORD);
    // trova la prossima domenica (il salone è chiuso domenica e lunedì)
    const sunday = new Date();
    sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7));
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(sunday);
    await page.goto(`/agenda?g=${date}`);
    await expect(visibleText(page, "Domenica: salone chiuso")).toBeVisible();
    await expect(visibleText(page, "Puoi cambiare giorni di apertura e chiusure da Listino e orari.")).toBeVisible();
  });

  test("un giorno senza appuntamenti lo dice", async ({ page }) => {
    await signIn(page, ANDREA, DEMO_PASSWORD);
    const far = new Date();
    far.setDate(far.getDate() + 200);
    while (far.getDay() !== 3) far.setDate(far.getDate() + 1); // un mercoledì lontano, aperto
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(far);
    await page.goto(`/agenda?g=${date}`);
    await expect(visibleText(page, "Nessun appuntamento")).toBeVisible();
    await expect(visibleText(page, "Fissa il primo cliente o condividi il link per ricevere prenotazioni.")).toBeVisible();
  });

  test("un barbiere senza «vedere l'agenda di tutti» vede solo la propria colonna", async ({ page }) => {
    const { date, byOperator } = await seedDay();
    try {
      await adminUpdate("salons", `id=eq.${SALON}`, { barbers_see_all: false });
      await signIn(page, MARCO, DEMO_PASSWORD);
      await page.goto(`/agenda?g=${date}`);
      await expect(visibleText(page, byOperator["Marco"]![0]!)).toBeVisible();
      for (const [name, clients] of Object.entries(byOperator)) {
        if (name !== "Marco") await expect(page.getByText(clients[0]!).filter({ visible: true })).toHaveCount(0);
      }
      await expect(page.getByRole("navigation", { name: "Barbieri" })).toHaveCount(0); // un solo barbiere: niente filtro
    } finally {
      await adminUpdate("salons", `id=eq.${SALON}`, { barbers_see_all: true });
    }
  });

  test("la navigazione porta alle altre schede", async ({ page, isMobile }) => {
    await signIn(page, ANDREA, DEMO_PASSWORD);
    await page.goto("/agenda");
    // desktop: barra laterale; telefono: pulsante «Menu» che apre il pannello da destra
    const nav = isMobile ? page.getByRole("dialog", { name: "Menu" }) : page.getByRole("navigation", { name: "Menu principale" });
    const open = async () => {
      if (isMobile) await page.getByRole("button", { name: "Menu" }).click();
    };
    await open();
    await nav.getByRole("link", { name: "Clienti" }).click();
    await expect(page).toHaveURL(/\/clienti$/);
    await open();
    await nav.getByRole("link", { name: "Agenda" }).click();
    await expect(page).toHaveURL(/\/agenda$/);
  });
});
