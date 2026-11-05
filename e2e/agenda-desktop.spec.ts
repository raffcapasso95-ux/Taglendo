import { expect, test } from "@playwright/test";
import { dialog, freshOwner, nextOpenDay, romeNow } from "./agenda-helpers";
import { adminInsert, adminSelect } from "./helpers";

/** Agenda su desktop: la giornata sta nello spazio e la barra di destra serve a qualcosa. */
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "solo desktop");

async function setup(salonName: string, page: import("@playwright/test").Page) {
  await freshOwner(page, salonName);
  const [salon] = await adminSelect<{ id: string }>("salons", `select=id&name=eq.${salonName}&order=created_at.desc&limit=1`);
  const [member] = await adminSelect<{ id: string }>("members", `select=id&salon_id=eq.${salon!.id}&order=chair_no&limit=1`);
  const [service] = await adminSelect<{ id: string; name: string; price_cents: number }>("services", `select=id,name,price_cents&salon_id=eq.${salon!.id}&order=sort&limit=1`);
  let n = 0;
  const book = async (day: string, h: number, m: number, name: string, status = "confermato") => {
    const rome = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }).format(d);
    const want = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const winter = new Date(`${day}T${want}:00+01:00`);
    const when = rome(winter) === want ? winter : new Date(`${day}T${want}:00+02:00`);
    const [client] = await adminInsertReturning("clients", { salon_id: salon!.id, name });
    await adminInsert("appointments", {
      salon_id: salon!.id, member_id: member!.id, client_id: client!.id, service_id: service!.id, service_name: service!.name, price_cents: service!.price_cents,
      public_code: `TG-A${Math.floor(10000 + Math.random() * 89999)}${n++}`, starts_at: when.toISOString(), ends_at: new Date(when.getTime() + 30 * 60000).toISOString(), status,
    });
  };
  return { salon: salon!, book };
}

async function adminInsertReturning(table: string, body: Record<string, unknown>) {
  // si legge subito dopo l'inserimento (nome unico per salone)
  await adminInsert(table, body);
  return adminSelect<{ id: string }>(table, `select=id&salon_id=eq.${body.salon_id}&name=eq.${encodeURIComponent(String(body.name))}&limit=1`);
}

test.describe("Agenda desktop", () => {
  test("un appuntamento a inizio e uno a fine giornata si vedono insieme, senza scorrere", async ({ page }) => {
    const { book } = await setup("Barberia Griglia Compatta", page);
    const day = nextOpenDay();
    await book(day, 9, 0, "Primo Mattino");
    await book(day, 18, 0, "Ultimo Sera");
    await page.goto(`/agenda?g=${day}`);
    const first = page.getByRole("button", { name: /Primo Mattino/ }).first();
    const last = page.getByRole("button", { name: /Ultimo Sera/ }).first();
    await expect(first).toBeVisible();
    await expect(last).toBeVisible();
    const grid = page.getByTestId("agenda-grid");
    const g = (await grid.boundingBox())!;
    const [a, b] = [(await first.boundingBox())!, (await last.boundingBox())!];
    // entrambi dentro l'area visibile della griglia, senza aver scorso
    expect(a.y).toBeGreaterThanOrEqual(g.y);
    expect(b.y + b.height).toBeLessThanOrEqual(g.y + g.height + 1);
    expect(await grid.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  });

  test("barra di destra: un posto libero apre il nuovo appuntamento già compilato", async ({ page }) => {
    const { book } = await setup("Barberia Barra Destra", page);
    const day = nextOpenDay();
    await book(day, 9, 0, "Cliente Uno");
    await page.goto(`/agenda?g=${day}`);
    const side = page.getByRole("complementary", { name: "Adesso in salone" });
    await expect(side.getByText("Oggi in numeri").or(side.getByText("Giornata in numeri"))).toBeVisible();
    await expect(side.getByText("Cliente Uno")).toBeVisible(); // i prossimi si vedono e si aprono
    await side.getByRole("button", { name: /\+ Fissa/ }).first().click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByRole("heading", { name: "Nuovo appuntamento" })).toBeVisible();
  });

  test("barra di destra: un appuntamento finito si chiude con «Completato» senza aprire nulla", async ({ page }) => {
    const now = romeNow();
    test.skip(now.minutes < 9 * 60 + 40 || now.minutes > 18 * 60, "serve un orario in cui il salone è aperto da almeno 40 minuti");
    const { book } = await setup("Barberia Da Chiudere", page);
    const start = now.minutes - 35; // finito 5 minuti fa
    await book(now.date, Math.floor(start / 60), start % 60, "Cliente Finito");
    await page.goto("/agenda");
    const side = page.getByRole("complementary", { name: "Adesso in salone" });
    await expect(side.getByText(/da chiudere/)).toBeVisible();
    await side.getByRole("button", { name: "Completato" }).first().click();
    await expect(page.getByText("Segnato come completato").first()).toBeVisible();
    await expect(side.getByText(/da chiudere/)).toHaveCount(0);
    const rows = await adminSelect<{ status: string }>("appointments", "select=status&order=created_at.desc&limit=1");
    expect(rows[0]!.status).toBe("completato");
  });
});
