import { expect, type Page } from "@playwright/test";
import { completeOnboarding, createVerifiedUser, signIn, uniqueEmail } from "./helpers";

export const SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

/** Ora e giorno di Roma adesso. */
export function romeNow() {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" }).format(new Date()); // 2026-11-03 09:23
  const [date, time] = parts.split(" ") as [string, string];
  const [h, m] = time.split(":").map(Number) as [number, number];
  return { date, minutes: h * 60 + m };
}
export const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const addDay = (date: string, n: number) => new Date(new Date(`${date}T12:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

/** Il primo giorno di apertura (mar–sab) dopo oggi: gli orari non dipendono dall'ora in cui si lancia il test. */
export function nextOpenDay() {
  let d = addDay(romeNow().date, 1);
  while (weekday(d) < 2) d = addDay(d, 1);
  return d;
}

export const newButton = (page: Page) => page.getByRole("button", { name: /^\+ (Nuovo appuntamento|Appuntamento)$/ }).filter({ visible: true });
export const dialog = (page: Page) => page.getByRole("dialog");

/** Titolare con un salone nuovo e finito il primo avvio. */
export async function freshOwner(page: Page, salon: string) {
  const email = uniqueEmail("agenda");
  await createVerifiedUser(email, "Andrea Conti");
  await signIn(page, email);
  await completeOnboarding(page, salon);
  return email;
}

/** Gli orari del giorno sono sempre tutti sulla schermata (dal ridisegno): non c'è più niente da aprire. */
export async function showAllTimes() {}

/** Sceglie un orario del giorno già mostrato. */
export async function pickTime(page: Page, time: string) {
  await dialog(page).getByRole("button", { name: time, exact: true }).click();
}

export async function pickDayAndTime(page: Page, date: string, time: string) {
  const label = `${SHORT[weekday(date)]} ${Number(date.slice(8))}`;
  await dialog(page).getByRole("button", { name: label, exact: true }).click();
  await dialog(page).getByRole("button", { name: time, exact: true }).click();
}

export async function bookNewClient(page: Page, name: string, date: string, time: string) {
  await newButton(page).click();
  await dialog(page).getByRole("button", { name: /^Nuovo( cliente)?$/ }).click();
  await dialog(page).getByLabel("Nome").fill(name);
  await pickDayAndTime(page, date, time);
  await dialog(page).getByRole("button", { name: "Fissa l’appuntamento" }).click();
}

/** Apre la scheda di un appuntamento dal nome del cliente; con `time` («10:30») sceglie proprio quello, se il cliente ne ha più d'uno. */
export async function openAppointment(page: Page, name: string, time?: string) {
  // oggi le ore già passate sono nascoste (in griglia e in elenco): si mostrano prima di cercare l'appuntamento,
  // altrimenti il click finisce sulla barra che le copre (dipendeva dall'ora in cui girava il test)
  const showPast = page.getByText("Mostra", { exact: true }).filter({ visible: true });
  if (await showPast.count()) await showPast.first().click();
  // il pulsante dell'appuntamento (griglia, elenco o colonna di destra): il solo testo del nome può stare anche
  // dove non si clicca, e l'avviso dopo il salvataggio contiene lo stesso nome dentro una frase più lunga
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = time ? new RegExp(`^${time}(\\s|$).*${escaped}(\\s|$)`) : new RegExp(`(^|\\s)${escaped}(\\s|$)`);
  const target = page.getByRole("button", { name: pattern }).filter({ visible: true }).first();
  // subito dopo il caricamento la pagina può non rispondere ancora ai click: si riprova finché la scheda si apre
  await expect(async () => {
    if (!(await dialog(page).isVisible())) await target.click();
    await expect(dialog(page)).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
}

