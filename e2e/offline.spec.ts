import { expect, test } from "@playwright/test";
import { bookNewClient, dialog, freshOwner, nextOpenDay, openAppointment, pickTime } from "./agenda-helpers";
import { adminInsert, adminSelect, visibleText } from "./helpers";

const run = Math.random().toString(36).slice(2, 6);
const bar = (page: import("@playwright/test").Page) => page.getByTestId("offline-bar");

test.describe("Senza rete", () => {
  test("la barra dice «Sei offline» e sparisce quando torna la rete", async ({ page, context }) => {
    await freshOwner(page, "Barberia Offline Uno");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await expect(bar(page)).toHaveCount(0);
    await page.waitForFunction(() => localStorage.getItem("tg-agenda-saved")); // l'agenda è stata salvata
    await context.setOffline(true);
    await expect(bar(page)).toContainText("Sei offline");
    await expect(bar(page)).toContainText("Vedi l’agenda salvata alle");
    await expect(bar(page)).toContainText("Le modifiche partono appena torni online.");
    await context.setOffline(false);
    await expect(bar(page)).toHaveCount(0);
  });

  test("nuovo appuntamento offline: in attesa di invio, poi parte da solo", async ({ page, context }) => {
    await freshOwner(page, "Barberia Offline Due");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await expect(visibleText(page, /Libero|libere|libero/)).toBeVisible();

    await context.setOffline(true);
    await page.getByRole("button", { name: /^\+ (Nuovo appuntamento|Appuntamento)$/ }).filter({ visible: true }).click();
    await dialog(page).getByRole("button", { name: /^Nuovo( cliente)?$/ }).click();
    await dialog(page).getByLabel("Nome").fill(`Osvaldo ${run}`);
    // gli orari vengono dalla fotografia del giorno
    await pickTime(page, "11:00");
    await dialog(page).getByRole("button", { name: "Fissa l’appuntamento" }).click();
    await expect(page.getByText("Salvato sul telefono").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Parte appena torni online").filter({ visible: true })).toBeVisible();
    const pending = page.getByRole("region", { name: "In attesa di invio" });
    await expect(pending).toContainText(`Osvaldo ${run}`);
    await expect(pending).toContainText("11:00");
    await expect(bar(page)).toContainText("1 modifica in attesa di invio");

    // non è ancora nel database
    expect(await adminSelect("clients", `select=id&name=eq.Osvaldo ${run}`)).toHaveLength(0);

    await context.setOffline(false);
    await expect(page.getByRole("region", { name: "In attesa di invio" })).toHaveCount(0, { timeout: 15000 });
    const rows = await adminSelect<{ source: string; status: string }>("appointments", `select=source,status,client:clients!inner(name)&clients.name=eq.Osvaldo ${run}&order=created_at.desc&limit=1`);
    expect(rows.length).toBeGreaterThan(0);
    await expect(visibleText(page, `Osvaldo ${run}`)).toBeVisible();
  });

  test("cambio di stato offline: parte quando torna la rete", async ({ page, context }) => {
    await freshOwner(page, "Barberia Offline Tre");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await bookNewClient(page, `Tommaso ${run}`, day, "10:00");
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();
    // la scheda in griglia (non l'avviso): l'agenda si è ricaricata col nuovo appuntamento
    await expect(page.getByText(`Tommaso ${run}`, { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await context.setOffline(true);
    await openAppointment(page, `Tommaso ${run}`);
    // spostare e annullare servono la rete
    await expect(dialog(page).getByRole("button", { name: "Sposta" })).toBeDisabled();
    await expect(dialog(page).getByRole("button", { name: "Annulla", exact: true })).toBeDisabled();
    await dialog(page).getByRole("button", { name: "Completato" }).click();
    await expect(page.getByText("Salvato sul telefono").filter({ visible: true })).toBeVisible();
    await expect(bar(page)).toContainText("1 modifica in attesa di invio");

    await context.setOffline(false);
    await expect(bar(page)).toHaveCount(0, { timeout: 15000 });
    const rows = await adminSelect<{ status: string }>("appointments", "select=status&order=created_at.desc&limit=1");
    expect(rows[0]!.status).toBe("completato");
  });

  test("orario preso nel frattempo: la modifica non sparisce, dice perché e si può scartare", async ({ page, context }) => {
    await freshOwner(page, "Barberia Offline Quattro");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await context.setOffline(true);
    await page.getByRole("button", { name: /^\+ (Nuovo appuntamento|Appuntamento)$/ }).filter({ visible: true }).click();
    await dialog(page).getByRole("button", { name: /^Nuovo( cliente)?$/ }).click();
    await dialog(page).getByLabel("Nome").fill(`Annalisa ${run}`);
    await pickTime(page, "12:00");
    await dialog(page).getByRole("button", { name: "Fissa l’appuntamento" }).click();
    await expect(page.getByRole("region", { name: "In attesa di invio" })).toContainText(`Annalisa ${run}`);

    // nel frattempo qualcun altro prende lo stesso orario (altro dispositivo)
    const [salon] = await adminSelect<{ id: string }>("salons", "select=id&name=eq.Barberia Offline Quattro&order=created_at.desc&limit=1");
    const [member] = await adminSelect<{ id: string }>("members", `select=id&salon_id=eq.${salon!.id}&order=chair_no&limit=1`);
    const [service] = await adminSelect<{ id: string; name: string; price_cents: number }>("services", `select=id,name,price_cents&salon_id=eq.${salon!.id}&order=sort&limit=1`);
    // 12:00 di Roma: in inverno 11:00 UTC, in estate 10:00 UTC
    const rome = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(d);
    const winter = new Date(`${day}T12:00:00+01:00`);
    const when = rome(winter) === "12:00" ? winter : new Date(`${day}T12:00:00+02:00`);
    await adminInsert("appointments", { salon_id: salon!.id, member_id: member!.id, service_id: service!.id, service_name: service!.name, price_cents: service!.price_cents, public_code: `TG-${Math.floor(100000 + Math.random() * 899999)}`, starts_at: when.toISOString(), ends_at: new Date(when.getTime() + 30 * 60000).toISOString() });

    await context.setOffline(false);
    await expect(bar(page).getByRole("alert")).toContainText(`Annalisa ${run}`, { timeout: 15000 });
    await expect(bar(page).getByRole("alert")).toContainText("Orario appena prenotato");
    await bar(page).getByRole("button", { name: "Elimina" }).click();
    await expect(bar(page)).toHaveCount(0);
  });
});
