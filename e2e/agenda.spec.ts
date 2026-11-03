import { expect, test } from "@playwright/test";
import { adminUpdate, seedDay, signIn, visibleText } from "./helpers";

const ANDREA = "andrea@barberia-saragozza.example";
const MARCO = "marco@barberia-saragozza.example";
const DEMO_PASSWORD = "taglendo-demo";
const SALON = "5a100000-0000-4000-8000-000000000001";

test.describe("Agenda (sola lettura)", () => {
  test("il titolare vede la giornata con i tre barbieri e il riepilogo", async ({ page }) => {
    const day = await seedDay();
    await signIn(page, ANDREA, DEMO_PASSWORD);
    await page.goto(`/agenda?g=${day}`);

    await expect(page.getByRole("heading", { level: 1 }).filter({ visible: true })).toContainText(/\d{1,2} \w+/);
    await expect(visibleText(page, /^\d+ clienti · .+ libere$/)).toBeVisible();
    // il nome di ogni cliente del seed compare nel giorno
    for (const name of ["Marco Bianchi", "Giorgio Conti", "Alessio Ricci"]) {
      await expect(visibleText(page, name)).toBeVisible();
    }
    // il filtro per barbiere
    const filter = page.getByRole("navigation", { name: "Barbieri" });
    await expect(filter.getByRole("link", { name: "Tutti" })).toHaveAttribute("aria-current", "true");
    await filter.getByRole("link", { name: "Marco" }).click();
    await expect(page).toHaveURL(/op=/);
    await expect(visibleText(page, "Giorgio Conti")).toBeVisible();
    await expect(page.getByText("Marco Bianchi").filter({ visible: true })).toHaveCount(0); // è di Andrea
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
    const day = await seedDay();
    try {
      await adminUpdate("salons", `id=eq.${SALON}`, { barbers_see_all: false });
      await signIn(page, MARCO, DEMO_PASSWORD);
      await page.goto(`/agenda?g=${day}`);
      await expect(visibleText(page, "Giorgio Conti")).toBeVisible(); // di Marco
      await expect(page.getByText("Marco Bianchi").filter({ visible: true })).toHaveCount(0); // di Andrea
      await expect(page.getByText("Alessio Ricci").filter({ visible: true })).toHaveCount(0); // di Simone
      await expect(page.getByRole("navigation", { name: "Barbieri" })).toHaveCount(0); // un solo barbiere: niente filtro
    } finally {
      await adminUpdate("salons", `id=eq.${SALON}`, { barbers_see_all: true });
    }
  });

  test("la navigazione porta alle altre schede", async ({ page, isMobile }) => {
    await signIn(page, ANDREA, DEMO_PASSWORD);
    await page.goto("/agenda");
    const nav = page.getByRole("navigation", { name: "Menu principale" }).filter({ visible: true });
    await nav.getByRole("link", { name: isMobile ? "Clienti" : "Clienti" }).click();
    await expect(page).toHaveURL(/\/clienti$/);
    await nav.getByRole("link", { name: "Agenda" }).click();
    await expect(page).toHaveURL(/\/agenda$/);
  });
});
