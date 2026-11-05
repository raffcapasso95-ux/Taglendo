import { expect, test } from "@playwright/test";
import { bookNewClient, dialog, freshOwner, newButton, nextOpenDay } from "./agenda-helpers";
import { adminSelect } from "./helpers";

/** Nuovo appuntamento: poche scelte alla volta, orari proposti, riepilogo sempre vicino al pulsante. */
test.describe("Nuovo appuntamento", () => {
  test("si parte da pochi orari liberi; giorno e griglia completa stanno dietro «Altro orario o giorno»", async ({ page }) => {
    await freshOwner(page, "Barberia Flusso Semplice");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await newButton(page).click();
    const d = dialog(page);

    const group = d.getByRole("group", { name: /^Primi orari liberi/ });
    await expect(group).toBeVisible();
    const proposed = group.getByRole("button");
    expect(await proposed.count()).toBeLessThanOrEqual(4);
    expect(await proposed.count()).toBeGreaterThan(0);
    // niente selettore dei giorni né griglia da 40 orari finché non lo si chiede
    await expect(d.getByRole("button", { name: /^(Dom|Lun|Mar|Mer|Gio|Ven|Sab) \d+$/ })).toHaveCount(0);

    // il pulsante «Fissa» aspetta il cliente; il riepilogo dice cosa manca
    await expect(d.getByRole("button", { name: "Fissa l’appuntamento" })).toBeDisabled();
    await expect(d.getByText(/Scegli il cliente/)).toBeVisible();

    await d.getByRole("button", { name: "Altro orario o giorno" }).click();
    await expect(d.getByRole("button", { name: /^(Dom|Lun|Mar|Mer|Gio|Ven|Sab) \d+$/ }).first()).toBeVisible();
    await expect(d.getByRole("button", { name: "Mostra solo i primi orari" })).toBeVisible();
  });

  test("tre scelte e l'appuntamento è fissato: cliente nuovo, un orario proposto, «Fissa»", async ({ page }) => {
    await freshOwner(page, "Barberia Tre Tocchi");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await newButton(page).click();
    const d = dialog(page);
    await d.getByRole("button", { name: "+ Nuovo cliente" }).click();
    await d.getByLabel("Nome").fill("Ettore Tretocchi");
    const first = d.getByRole("group", { name: /^Primi orari liberi/ }).getByRole("button").first();
    const time = ((await first.textContent()) ?? "").trim();
    await first.click();
    // la scelta si vede subito, e il riepilogo vicino al pulsante la ripete
    await expect(d.getByRole("button", { name: "Cambia orario" })).toBeVisible();
    await expect(d.getByText(new RegExp(`Ettore Tretocchi · .* · ${time}`))).toBeVisible();
    await d.getByRole("button", { name: "Fissa l’appuntamento" }).click();
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();

    const [client] = await adminSelect<{ id: string }>("clients", "select=id&name=eq.Ettore Tretocchi&order=created_at.desc&limit=1");
    const rows = await adminSelect<{ starts_at: string; status: string }>("appointments", `select=starts_at,status&client_id=eq.${client!.id}`);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("confermato");
  });

  test("dal buco in agenda l'ora è già scelta: resta solo cliente e «Fissa»", async ({ page }) => {
    await freshOwner(page, "Barberia Da Buco");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await bookNewClient(page, "Primo Cliente", day, "09:00"); // senza appuntamenti l'agenda non mostra i buchi
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Primo Cliente", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    // un buco libero della giornata (telefono: riga «Libero…», desktop: casella «+ Fissa»)
    await page.getByRole("button", { name: /^Fissa con/ }).filter({ visible: true }).first().click();
    const d = dialog(page);
    await expect(d).toBeVisible();
    await expect(d.getByRole("button", { name: "Cambia orario" })).toBeVisible(); // orario già scelto
    await expect(d.getByRole("group", { name: /^Primi orari liberi/ })).toHaveCount(0);
    await d.getByRole("button", { name: "+ Nuovo cliente" }).click();
    await d.getByLabel("Nome").fill("Bruno Dalbuco");
    await expect(d.getByRole("button", { name: "Fissa l’appuntamento" })).toBeEnabled();
  });
});
