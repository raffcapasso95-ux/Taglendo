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
    // la guida al primo accesso la prova un test apposito: agli altri utenti di prova non si mostra
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { name, tour_seen: true } }),
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

/** Inserisce una riga con la chiave di servizio (solo per preparare i test). */
export async function adminInsert(table: string, body: Record<string, unknown>) {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${table}: ${await res.text()}`);
}

const SEED_SALON = "5a100000-0000-4000-8000-000000000001";
const romeDay = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d);

/**
 * Il primo giorno di Roma dopo oggi con appuntamenti confermati nel seed, con i clienti di ogni barbiere.
 * Un giorno futuro non dipende dall'ora in cui si lancia il test (oggi gli appuntamenti passati si nascondono).
 * Il seed li mette sui primi giorni di apertura da quando si lancia `npm run db:reset`.
 */
export async function seedDay(): Promise<{ date: string; byOperator: Record<string, string[]> }> {
  const today = romeDay(new Date());
  const rows = await adminSelect<{ starts_at: string; member: { name: string }; client: { name: string } }>(
    "appointments",
    `select=starts_at,member:members(name),client:clients(name)&salon_id=eq.${SEED_SALON}&status=eq.confermato&starts_at=gte.${new Date().toISOString()}&order=starts_at.asc`,
  );
  const future = rows.filter((r) => romeDay(new Date(r.starts_at)) > today);
  if (!future[0]) throw new Error("Nessun appuntamento futuro nel seed: lancia `npm run db:reset`");
  const date = romeDay(new Date(future[0].starts_at));
  const byOperator: Record<string, string[]> = {};
  for (const r of future.filter((x) => romeDay(new Date(x.starts_at)) === date)) {
    (byOperator[r.member.name] ??= []).push(r.client.name);
  }
  return { date, byOperator };
}

/** Il codice della prenotazione online (F1): sta nell'oggetto, "Il tuo codice: 482 913". */
export async function bookingCode(email: string): Promise<string> {
  const { subject } = await waitForEmail(email);
  const match = /(\d{3}) (\d{3})/.exec(subject);
  if (!match) throw new Error(`Codice non trovato nell'oggetto: ${subject}`);
  return `${match[1]}${match[2]}`;
}

type MailRow = { ID: string; Subject: string; To: Array<{ Address: string }> };
const mailList = async () => ((await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()) as { messages: MailRow[] }).messages;

/** Aspetta un'email a questo indirizzo con un oggetto che corrisponde, e ne restituisce l'HTML. */
export async function waitForMail(to: string, subject: RegExp, timeoutMs = 15000): Promise<{ subject: string; html: string }> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const found = (await mailList()).find((m) => subject.test(m.Subject) && m.To.some((t) => t.Address === to));
    if (found) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${found.ID}`)).json()) as { HTML?: string; Text?: string };
      return { subject: found.Subject, html: full.HTML ?? full.Text ?? "" };
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Nessuna email per ${to} con oggetto ${subject}`);
}

/** Quante email con questo oggetto sono arrivate a questo indirizzo. */
export async function countMail(to: string, subject: RegExp): Promise<number> {
  return (await mailList()).filter((m) => subject.test(m.Subject) && m.To.some((t) => t.Address === to)).length;
}
