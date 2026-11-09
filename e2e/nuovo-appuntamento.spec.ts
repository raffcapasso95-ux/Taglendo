import { expect, test } from "@playwright/test";
import { bookNewClient, dialog, freshOwner, newButton, nextOpenDay } from "./agenda-helpers";
import { adminSelect, signIn } from "./helpers";

/** Nuovo appuntamento (ridisegno novembre 2026): una schermata con quattro blocchi sempre aperti e il riepilogo in fondo. */
test.describe("Nuovo appuntamento", () => {
  test("blocchi numerati (Cosa, Quando, Per chi), giorni e orari liberi divisi in mattina e pomeriggio, riepilogo che dice cosa manca", async ({ page }) => {
    await freshOwner(page, "Barberia Flusso Semplice");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await newButton(page).click();
    const d = dialog(page);
    await expect(d.getByRole("heading", { name: "Nuovo appuntamento", level: 2 })).toBeVisible();
    // un solo barbiere: niente blocco «Con chi», quindi tre blocchi, nell'ordine Cosa, Quando, Per chi
    await expect(d.getByRole("heading", { level: 3 })).toHaveText(["Cosa", "Quando", "Per chi"]);
    await expect(d.getByRole("heading", { name: "Con chi" })).toHaveCount(0);
    await expect(d.getByRole("group", { name: "Mattina" })).toBeVisible();
    await expect(d.getByRole("group", { name: "Pomeriggio" })).toBeVisible();
    await expect(d.getByText(/^Orari liberi con Chiunque · .*$/)).toBeVisible();
    // ogni gruppo dice quanti orari liberi ha; un solo barbiere: niente tondi di chi è libero
    await expect(d.getByText(/^\d+ liber[oi]$/).first()).toBeVisible();
    await expect(d.getByRole("group", { name: "Mattina" }).getByRole("button").first()).not.toHaveAttribute("title", /libero:/);
    await expect(d.getByRole("group", { name: "Giorno" }).getByRole("button")).toHaveCount(14);
    await expect(d.getByRole("button", { name: "Apri il calendario" })).toHaveAttribute("aria-expanded", "false");

    // il pulsante «Fissa» aspetta orario e cliente; il riepilogo dice cosa manca
    await expect(d.getByRole("button", { name: "Fissa l’appuntamento" })).toBeDisabled();
    await expect(d.getByText("Scegli giorno e ora · Scegli il cliente")).toBeVisible();
  });

  test("giorno e ora scelti, cliente nuovo, «Fissa»: l'appuntamento è creato con il suo colore", async ({ page }) => {
    await freshOwner(page, "Barberia Tre Tocchi");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await newButton(page).click();
    const d = dialog(page);
    const first = d.getByRole("group", { name: "Mattina" }).getByRole("button").first();
    const time = ((await first.textContent()) ?? "").trim();
    await first.click();
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await d.getByRole("button", { name: /^Nuovo( cliente)?$/ }).click();
    await d.getByLabel("Nome", { exact: true }).fill("Ettore Tretocchi");
    await d.getByRole("button", { name: "Lavanda" }).click();
    // l'anteprima dell'avatar e il riepilogo seguono le scelte
    await expect(d.getByText("ET", { exact: true })).toBeVisible();
    await expect(d.getByText(new RegExp(`${time} · Ettore Tretocchi`))).toBeVisible();
    await d.getByRole("button", { name: "Fissa l’appuntamento" }).click();
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();

    const [client] = await adminSelect<{ id: string; avatar_color: number }>("clients", "select=id,avatar_color&name=eq.Ettore Tretocchi&order=created_at.desc&limit=1");
    expect(client!.avatar_color).toBe(4); // Lavanda
    const rows = await adminSelect<{ starts_at: string; status: string }>("appointments", `select=starts_at,status&client_id=eq.${client!.id}`);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("confermato");
  });

  test("dal buco in agenda giorno e ora sono già scelti: restano solo il cliente e «Fissa»", async ({ page }) => {
    await freshOwner(page, "Barberia Da Buco");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await bookNewClient(page, "Primo Cliente", day, "09:00"); // senza appuntamenti l'agenda non mostra i buchi
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Primo Cliente", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.getByRole("button", { name: /fissa con/i }).filter({ visible: true }).first().click();
    const d = dialog(page);
    await expect(d).toBeVisible();
    await expect(d.getByText(/^[A-Z][a-z]{2} \d+ [a-z]{3} · \d\d:\d\d · Scegli il cliente$/)).toBeVisible(); // quando già scelto
    await d.getByRole("button", { name: /^Nuovo( cliente)?$/ }).click();
    await d.getByLabel("Nome", { exact: true }).fill("Bruno Dalbuco");
    await expect(d.getByRole("button", { name: "Fissa l’appuntamento" })).toBeEnabled();
  });

  test("il calendario dentro «Quando» porta a un giorno lontano; i giorni chiusi sono spenti", async ({ page }) => {
    await freshOwner(page, "Barberia Calendario Flusso");
    await page.goto("/agenda");
    await newButton(page).click();
    const d = dialog(page);
    await d.getByRole("button", { name: "Apri il calendario" }).click();
    await expect(d.getByRole("button", { name: "Apri il calendario" })).toHaveAttribute("aria-expanded", "true");
    await expect(d.getByRole("button", { name: /domenica .*, chiuso/i }).first()).toBeDisabled();
    await d.getByRole("button", { name: "Mese successivo" }).click();
    await d.getByRole("button", { name: /^Mercoledì \d+ .* 20\d\d$/ }).first().click();
    // scelto il giorno tornano gli orari, e il pulsante del calendario resta acceso con la data
    await expect(d.getByRole("group", { name: "Mattina" })).toBeVisible();
    await expect(d.getByRole("button", { name: "Apri il calendario" })).toContainText(/\d+ [a-z]{3}/);
  });

  test("più barbieri: prima Con chi, poi Quando; con «Chiunque» ogni orario dice chi è libero, scelto un barbiere solo i suoi", async ({ page }) => {
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo"); // Barberia Saragozza: 3 poltrone
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await newButton(page).click();
    const d = dialog(page);
    await expect(d.getByRole("heading", { level: 3 })).toHaveText(["Cosa", "Con chi", "Quando", "Per chi"]);

    // «Chiunque»: sotto ogni orario i tondi di chi è libero (anche nel titolo, per chi usa il lettore di schermo)
    const morning = d.getByRole("group", { name: "Mattina" });
    const firstFree = morning.getByRole("button").first();
    await expect(firstFree).toHaveAttribute("title", /^libero: (Andrea|Marco|Simone)/);
    const anyCount = await morning.getByRole("button").count();

    // scelto Marco: gli orari sono solo i suoi, senza tondi, e il suggerimento lo dice
    await d.getByRole("group", { name: "Barbiere" }).getByRole("button", { name: /^Marco/ }).click();
    await expect(d.getByText(/^Orari liberi con Marco · /)).toBeVisible();
    await expect(morning.getByRole("button").first()).not.toHaveAttribute("title", /libero:/);
    expect(await morning.getByRole("button").count()).toBeLessThanOrEqual(anyCount);

    // gli occupati non si vedono finché non li si chiede; poi sono spenti
    const toggle = d.getByRole("button", { name: "Mostra anche gli occupati" });
    if (await toggle.isVisible()) {
      const before = await d.getByRole("button", { disabled: true, name: /^\d\d:\d\d$/ }).count();
      expect(before).toBe(0);
      await toggle.click();
      await expect(d.getByRole("button", { name: "Nascondi gli occupati" })).toHaveAttribute("aria-pressed", "true");
      expect(await d.getByRole("button", { disabled: true, name: /^\d\d:\d\d$/ }).count()).toBeGreaterThan(0);
    }
  });

  test("con il prezzo cambiato dalla matita il riepilogo dice «invece di» e il database tiene i due prezzi", async ({ page }) => {
    await freshOwner(page, "Barberia Prezzo Cliente");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await newButton(page).click();
    const d = dialog(page);
    await d.getByRole("group", { name: "Mattina" }).getByRole("button").first().click();
    await d.getByRole("button", { name: /^Nuovo( cliente)?$/ }).click();
    await d.getByLabel("Nome", { exact: true }).fill("Sara Sconto");
    // il prezzo si cambia solo dalla matita: i campi non si vedono finché non la si tocca
    await expect(d.getByLabel("Prezzo per questo cliente (€)")).toBeHidden();
    await d.getByRole("button", { name: "Cambia prezzo" }).click();
    await d.getByRole("button", { name: "−20%" }).click();
    await d.getByLabel("Motivo · facoltativo").fill("Promo studenti");
    await expect(d.getByText(/ invece di /)).toBeVisible();
    await d.getByRole("button", { name: "Fissa l’appuntamento" }).click();
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();

    const [client] = await adminSelect<{ id: string }>("clients", "select=id&name=eq.Sara Sconto&order=created_at.desc&limit=1");
    const [row] = await adminSelect<{ price_cents: number; list_price_cents: number; price_note: string }>("appointments", `select=price_cents,list_price_cents,price_note&client_id=eq.${client!.id}`);
    expect(row!.list_price_cents).toBeGreaterThan(0);
    expect(row!.price_cents).toBe(Math.round(row!.list_price_cents * 0.8));
    expect(row!.price_note).toBe("Promo studenti");
  });

  test("«Cliente in negozio»: Quando è fisso su «Adesso» e si parte dal cliente", async ({ page }) => {
    await freshOwner(page, "Barberia In Negozio Flusso");
    await page.goto("/agenda");
    await page.getByRole("button", { name: /^(Cliente in negozio|In negozio ora)$/ }).filter({ visible: true }).click();
    const d = dialog(page);
    await expect(d.getByRole("heading", { name: "Cliente in negozio", level: 2 })).toBeVisible();
    await expect(d.getByText("Adesso", { exact: true })).toBeVisible();
    await expect(d.getByText(/^Inizia subito, alle \d\d:\d\d$/)).toBeVisible();
    await expect(d.getByRole("group", { name: "Giorno" })).toHaveCount(0);
    await expect(d.getByText(/^Adesso · \d\d:\d\d · Scegli il cliente$/)).toBeVisible();
  });

  test("su telefono il tasto indietro chiude la schermata", async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo telefono");
    await freshOwner(page, "Barberia Indietro");
    await page.goto("/agenda");
    await newButton(page).click();
    await expect(dialog(page)).toBeVisible();
    await page.goBack();
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(/\/agenda$/);
  });
});
