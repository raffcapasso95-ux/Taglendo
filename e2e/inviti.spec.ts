import { expect, test } from "@playwright/test";
import { adminSelect, adminUpdate, completeOnboarding, createVerifiedUser, PASSWORD, signIn, uniqueEmail, visibleText } from "./helpers";

test.describe("Operatori e inviti", () => {
  test("il titolare invita un barbiere, che sceglie la password ed entra nel salone", async ({ page, browser, baseURL }) => {
    const owner = uniqueEmail("titolare");
    await createVerifiedUser(owner, "Andrea Conti");
    await signIn(page, owner);
    await completeOnboarding(page, "Barberia Inviti");
    await page.getByRole("link", { name: "Vai all’agenda" }).click();
    await expect(page).toHaveURL(/\/agenda$/);

    await page.goto("/impostazioni/operatori");
    await expect(page.getByRole("heading", { name: "Operatori" })).toBeVisible();
    await expect(page.getByText("Tu · Poltrona 1")).toBeVisible();

    // invita un nuovo barbiere sulla prima poltrona libera
    const barber = uniqueEmail("barbiere");
    await page.getByRole("button", { name: "+ Invita un operatore" }).first().click();
    await page.getByLabel("Nome del barbiere").fill("Marco");
    await page.getByLabel("Email del barbiere").fill(barber);
    await page.getByRole("button", { name: "Crea invito" }).click();
    const link = await page.getByLabel("Copia link").inputValue();
    expect(link).toMatch(/\/invito\/[\w-]{20,}$/);
    await page.getByRole("button", { name: "Chiudi" }).click();
    await expect(page.getByText("Poltrona 2 · invito in attesa")).toBeVisible();

    // il barbiere apre il link: email già scritta, sceglie solo nome e password
    const other = await browser.newContext();
    const barberPage = await other.newPage();
    await barberPage.goto(`${baseURL}${new URL(link).pathname}`);
    await expect(visibleText(barberPage, "Andrea ti ha invitato")).toBeVisible();
    await expect(barberPage.getByLabel("Email")).toHaveValue(barber);
    await expect(barberPage.getByLabel("Email")).toBeDisabled();
    await barberPage.getByLabel("Password", { exact: true }).fill("corta");
    await barberPage.getByRole("button", { name: "Entra nel salone" }).click();
    await expect(barberPage.getByText("Servono almeno 8 caratteri.")).toBeVisible();
    await barberPage.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await barberPage.getByRole("button", { name: "Entra nel salone" }).click();
    await expect(barberPage).toHaveURL(/\/agenda$/);

    // il barbiere non apre le impostazioni del salone
    await barberPage.goto("/impostazioni/operatori");
    await expect(barberPage).toHaveURL(/\/agenda$/);

    // lo stesso link non si usa due volte
    const third = await browser.newContext();
    const reuse = await third.newPage();
    await reuse.goto(`${baseURL}${new URL(link).pathname}`);
    await expect(visibleText(reuse, "Questo invito non è più valido")).toBeVisible();

    // nel database il barbiere è collegato e il token non esiste più
    const rows = await adminSelect<{ name: string; user_id: string | null; invite_expires_at: string | null }>(
      "members",
      `select=name,user_id,invite_expires_at&invite_email=eq.${encodeURIComponent(barber)}`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.user_id).not.toBeNull();
    expect(rows[0]!.invite_expires_at).toBeNull();

    await page.reload();
    await expect(page.getByText("Poltrona 2 · invito accettato")).toBeVisible();
    await other.close();
    await third.close();
  });

  test("un invito annullato o scaduto non funziona", async ({ page, browser, baseURL }) => {
    const owner = uniqueEmail("titolare");
    await createVerifiedUser(owner);
    await signIn(page, owner);
    await completeOnboarding(page, "Barberia Revoca");
    await page.goto("/impostazioni/operatori");

    await page.getByRole("button", { name: "+ Invita un operatore" }).first().click();
    await page.getByLabel("Nome del barbiere").fill("Luca");
    await page.getByLabel("Email del barbiere").fill(uniqueEmail("luca"));
    await page.getByRole("button", { name: "Crea invito" }).click();
    const link = await page.getByLabel("Copia link").inputValue();
    await page.getByRole("button", { name: "Chiudi" }).click();

    await page.getByRole("button", { name: "Annulla invito" }).click();
    await expect(page.getByText("Poltrona 2 · non ancora invitato")).toBeVisible();

    const ctx = await browser.newContext();
    const guest = await ctx.newPage();
    await guest.goto(`${baseURL}${new URL(link).pathname}`);
    await expect(visibleText(guest, "Questo invito non è più valido")).toBeVisible();
    await ctx.close();

    // un link inventato
    const fake = await browser.newContext();
    const g2 = await fake.newPage();
    await g2.goto(`${baseURL}/invito/abcdefghijklmnopqrstuvwxyz012345`);
    await expect(visibleText(g2, "Questo invito non è più valido")).toBeVisible();
    await fake.close();
  });

  test("i permessi dei barbieri si salvano", async ({ page }) => {
    await adminUpdate("salons", "id=eq.5a100000-0000-4000-8000-000000000001", { barbers_contacts: false }); // parte da uno stato noto
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo");
    await page.goto("/impostazioni/operatori");
    const contacts = page.getByRole("switch", { name: /Vedere telefono ed email dei clienti/ });
    // ogni clic parte dall'interruttore e aspetta che il salvataggio sul server sia finito
    const toggle = async (expected: "true" | "false") => {
      await Promise.all([page.waitForResponse((r) => r.request().method() === "POST"), page.getByRole("switch", { name: /Vedere telefono ed email dei clienti/ }).click()]);
      await expect(page.getByRole("switch", { name: /Vedere telefono ed email dei clienti/ })).toHaveAttribute("aria-checked", expected);
    };
    await expect(contacts).toHaveAttribute("aria-checked", "false");
    await toggle("true");
    await page.reload();
    await expect(page.getByRole("switch", { name: /Vedere telefono ed email dei clienti/ })).toHaveAttribute("aria-checked", "true");
    await toggle("false"); // ripristina il seed
  });
});
