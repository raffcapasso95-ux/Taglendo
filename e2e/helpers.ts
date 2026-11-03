import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Variabili di .env.local (le stesse dell'app). */
function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const line = file.split("\n").find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`Manca ${name} in .env.local`);
  return line.slice(name.length + 1).replace(/^"|"$/g, "");
}

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
export const PASSWORD = "Barbiere7!";

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

/** Aspetta l'email arrivata a questo indirizzo nella casella finta e ne restituisce il testo. */
export async function waitForEmail(to: string): Promise<{ subject: string; html: string }> {
  for (let i = 0; i < 40; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages`)).json()) as {
      messages: Array<{ ID: string; Subject: string; To: Array<{ Address: string }> }>;
    };
    const found = list.messages.find((m) => m.To.some((t) => t.Address === to));
    if (found) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${found.ID}`)).json()) as { HTML?: string; Text?: string };
      return { subject: found.Subject, html: full.HTML ?? full.Text ?? "" };
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Nessuna email per ${to}`);
}

export async function codeFor(email: string): Promise<string> {
  const { html } = await waitForEmail(email);
  const match = /(\d{6})/.exec(html);
  if (!match) throw new Error("Codice non trovato nell'email");
  return match[1]!;
}

/** Scrive il codice a 6 cifre nelle caselle. */
export async function typeCode(page: Page, code: string) {
  await page.getByLabel("Cifra 1 di 6").click();
  await page.keyboard.type(code, { delay: 25 });
}

/** Crea un utente già verificato con l'API di amministrazione (salta il codice per email). */
export async function createVerifiedUser(email: string, name = "Andrea Conti") {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { name } }),
  });
  if (!res.ok) throw new Error(`Utente non creato: ${await res.text()}`);
}

/** Accede e aspetta di aver lasciato /accedi. Con `expectError` resta lì e non aspetta. */
export async function signIn(page: Page, email: string, password = PASSWORD, options: { expectError?: boolean } = {}) {
  await page.goto("/accedi");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  if (!options.expectError) await page.waitForURL((url) => !url.pathname.startsWith("/accedi"));
}

/** Testo visibile: telefono e desktop hanno ciascuno la propria copia nel DOM, una sempre nascosta. */
export const visibleText = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true }).first();

/** Compila i 4 passi del primo avvio fino a "Tutto pronto". */
export async function completeOnboarding(page: Page, salon = "Barberia Prova") {
  await expect(page.getByRole("heading", { name: "Il tuo salone" })).toBeVisible();
  await page.getByLabel("Nome del salone").fill(salon);
  await page.getByLabel("Indirizzo").fill("Via Roma 1, Bologna");
  await page.getByLabel("Telefono").fill("051 123 4567");
  await page.getByRole("button", { name: "Continua" }).click();

  await expect(page.getByRole("heading", { name: "Quando sei aperto" })).toBeVisible();
  await page.getByRole("button", { name: "Continua" }).click();

  await expect(page.getByRole("heading", { name: "Cosa offri" })).toBeVisible();
  await page.getByRole("button", { name: "Continua" }).click();

  await expect(page.getByRole("heading", { name: "Chi lavora in salone" })).toBeVisible();
  await page.getByRole("button", { name: "Finisci" }).click();

  await expect(page.getByRole("heading", { name: "Il tuo link è attivo" })).toBeVisible();
}

/** Legge dal database (con la chiave di servizio) le righe di una tabella. */
export async function adminSelect<T = Record<string, unknown>>(table: string, query: string): Promise<T[]> {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`${table}: ${await res.text()}`);
  return (await res.json()) as T[];
}

/** Modifica righe di una tabella con la chiave di servizio (solo per preparare i test). */
export async function adminUpdate(table: string, query: string, body: Record<string, unknown>) {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${table}: ${await res.text()}`);
}

/**
 * Il giorno (di Roma) con gli appuntamenti del seed: il primo giorno da oggi in poi con appuntamenti confermati.
 * Il seed li mette sul primo giorno di apertura da quando si lancia `npm run db:reset`.
 */
export async function seedDay(): Promise<string> {
  const rows = await adminSelect<{ starts_at: string }>(
    "appointments",
    `select=starts_at&salon_id=eq.5a100000-0000-4000-8000-000000000001&status=eq.confermato&starts_at=gte.${new Date(Date.now() - 24 * 3600 * 1000).toISOString()}&order=starts_at.asc&limit=1`,
  );
  if (!rows[0]) throw new Error("Nessun appuntamento nel seed: lancia `npm run db:reset`");
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date(rows[0].starts_at));
}
