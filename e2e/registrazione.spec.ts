import { expect, test } from "@playwright/test";
import { adminSelect, codeFor, completeOnboarding, createVerifiedUser, PASSWORD, signIn, typeCode, uniqueEmail, visibleText, waitForMail } from "./helpers";

test.describe("Registrazione e primo avvio", () => {
  test("dalla registrazione al link attivo", async ({ page }) => {
    const email = uniqueEmail("titolare");

    await page.goto("/registrati");
    await page.getByLabel("Nome e cognome").fill("Giulia Neri");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await expect(page.getByText("Ottima")).toBeVisible();
    await page.getByRole("button", { name: "Crea account" }).click();
    // senza spuntare i termini non si va avanti
    await expect(page.getByText("Conferma di aver letto i termini")).toBeVisible();
    await page.getByText("Accetto i").click();
    await page.getByRole("button", { name: "Crea account" }).click();

    await expect(page.getByRole("heading", { name: "Controlla la tua email" })).toBeVisible();
    await expect(visibleText(page, email)).toBeVisible();

    // un codice sbagliato non entra
    await typeCode(page, "000000");
    await expect(page.getByText("Codice non corretto. Controlla l’email e riprova.")).toBeVisible();

    // quello giusto si conferma da solo all'ultima cifra
    await page.reload();
    await typeCode(page, await codeFor(email));
    await expect(page).toHaveURL(/\/primo-avvio\/1$/);

    await completeOnboarding(page, "Barberia Prova");
    await expect(page.getByText("Beta gratuita: non ti chiediamo nessun pagamento.")).toBeVisible();

    // nel database: salone in prova di 15 giorni, titolare e orari predefiniti
    const [salon] = await adminSelect<{ id: string; name: string; slug: string; onboarding_step: number; plan: string; trial_days: number }>(
      "salons",
      `select=id,name,slug,onboarding_step,plan&name=eq.Barberia%20Prova&order=created_at.desc&limit=1`,
    );
    expect(salon).toMatchObject({ name: "Barberia Prova", onboarding_step: 5, plan: "trial" });
    expect(salon!.slug).toMatch(/^barberia-prova(-\d+)?$/);
    const members = await adminSelect<{ name: string; role: string }>("members", `select=name,role&salon_id=eq.${salon!.id}`);
    expect(members).toEqual([{ name: "Giulia Neri", role: "owner" }]);
    const services = await adminSelect("services", `select=name&salon_id=eq.${salon!.id}`);
    expect(services).toHaveLength(5); // "Taglio lungo" era spento
  });

  test("non si salta un passo del primo avvio", async ({ page }) => {
    const email = uniqueEmail("salto");
    await createVerifiedUser(email);
    await signIn(page, email);
    await page.goto("/primo-avvio/3");
    await expect(page).toHaveURL(/\/primo-avvio\/1$/);
    await page.goto("/agenda");
    await expect(page).toHaveURL(/\/primo-avvio\/1$/);
  });

  test("password troppo corta e email non valida", async ({ page }) => {
    await page.goto("/registrati");
    await page.getByLabel("Email").fill("non-una-email");
    await page.getByLabel("Nome e cognome").click(); // esce dal campo
    await expect(page.getByText("Controlla l’indirizzo email.")).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("corta");
    await page.getByLabel("Nome e cognome").fill("Giulia Neri");
    await page.getByLabel("Email").fill(uniqueEmail("corta"));
    await page.getByText("Accetto i").click();
    await page.getByRole("button", { name: "Crea account" }).click();
    await expect(page.getByText("Servono almeno 8 caratteri.")).toBeVisible();
  });

  test("primo avvio come nelle impostazioni: orari per giorno, prezzi nascosti, invito al barbiere con l'email", async ({ page }) => {
    const email = uniqueEmail("wizard");
    const barber = uniqueEmail("barbiere");
    await createVerifiedUser(email, "Sara Galli");
    await signIn(page, email);
    await page.getByLabel("Nome del salone").fill("Barberia Wizard");
    await page.getByLabel("Indirizzo").fill("Via Roma 1, Bologna");
    await page.getByLabel("Telefono").fill("051 123 4567");
    await page.getByRole("button", { name: "Continua" }).click();

    // orari: lo stesso editor di Listino › Orari (interruttore per giorno, fasce nel foglio del giorno)
    await expect(page.getByRole("heading", { name: "Quando sei aperto" })).toBeVisible();
    await page.getByRole("switch", { name: /Sabato/ }).click(); // sabato chiuso
    await page.getByRole("button", { name: /^Venerdì/ }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Salva" }).click();
    await page.getByRole("button", { name: "Continua" }).click();

    // servizi: prezzi nascosti sulla pagina
    await expect(page.getByRole("heading", { name: "Cosa offri" })).toBeVisible();
    await page.getByRole("switch", { name: "Prezzi visibili sulla tua pagina" }).click();
    await page.getByRole("button", { name: "Continua" }).click();

    // poltrone: con l'email parte l'invito
    await expect(page.getByRole("heading", { name: "Chi lavora in salone" })).toBeVisible();
    await page.getByRole("button", { name: "2", exact: true }).click();
    await page.getByLabel("Poltrona 2").fill("Marco Verdi");
    await page.getByLabel(/^Email di Marco/).fill("non-una-email");
    await page.getByRole("button", { name: "Finisci" }).click();
    await expect(page.getByText("L’email del barbiere non sembra giusta.")).toBeVisible();
    await page.getByLabel(/^Email di Marco/).fill(barber);
    await page.getByRole("button", { name: "Finisci" }).click();
    await expect(page.getByRole("heading", { name: "Il tuo link è attivo" })).toBeVisible();

    const [salon] = await adminSelect<{ id: string; show_prices: boolean }>("salons", "select=id,show_prices&name=eq.Barberia%20Wizard&order=created_at.desc&limit=1");
    expect(salon!.show_prices).toBe(false);
    const days = await adminSelect<{ weekday: number; closed: boolean }>("opening_hours", `select=weekday,closed&salon_id=eq.${salon!.id}&order=weekday`);
    expect(days.find((d) => d.weekday === 6)?.closed).toBe(true);
    const [member] = await adminSelect<{ invite_email: string }>("members", `select=invite_email&salon_id=eq.${salon!.id}&chair_no=eq.2`);
    expect(member!.invite_email).toBe(barber);
    const invite = await waitForMail(barber, /./);
    expect(invite.html).toContain("/invito/");
  });
});
