import { expect, test } from "@playwright/test";
import { freshOwner } from "./agenda-helpers";
import { adminSelect, adminUpdate, signIn, visibleText } from "./helpers";

const SALON = "5a100000-0000-4000-8000-000000000001";
const PAGE = "/barberia-saragozza";

test.describe("Pagina pubblica del salone", () => {
  test("si vede senza accedere: nome, listino, barbieri, orari, telefono", async ({ page }) => {
    await adminUpdate("salons", `id=eq.${SALON}`, { show_prices: true });
    await page.goto(PAGE);
    await expect(page).toHaveTitle(/Barberia Saragozza/);
    await expect(page.getByRole("heading", { level: 1, name: "Barberia Saragozza" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Servizi", exact: true })).toBeVisible();
    await expect(page.locator("#prenota-card")).toBeVisible();
    await expect(page.locator("#prenota-card").getByRole("button", { name: /^Taglio uomo.*20 €/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chi ti taglia" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Orari e indirizzo" })).toBeVisible();
    await expect(page.getByText("Via Saragozza 48, Bologna").first()).toBeVisible();
    await expect(page.getByText("Lunedì").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "051 644 2190" }).first()).toHaveAttribute("href", "tel:+390516442190");
  });

  test("non mostra dati privati", async ({ page }) => {
    await page.goto(PAGE);
    const html = await page.content();
    expect(html).not.toMatch(/marco@|andrea@|invite|service_role|sb_secret/i);
  });

  test("con i prezzi nascosti non compare nessuna cifra del listino", async ({ page }) => {
    await adminUpdate("salons", `id=eq.${SALON}`, { show_prices: false });
    try {
      await page.goto(PAGE);
      await expect(page.locator("#prenota-card").getByRole("button", { name: /^Taglio uomo/ })).toBeVisible();
      await expect(page.getByText(/\d+ €/)).toHaveCount(0);
      await expect(page.getByText("Prezzi in salone.")).toBeVisible();
    } finally {
      await adminUpdate("salons", `id=eq.${SALON}`, { show_prices: true });
    }
  });

  test("un link che non esiste dice che la pagina non c'è", async ({ page }) => {
    await page.goto("/questo-salone-non-esiste");
    await expect(page.getByRole("heading", { name: "Barberia Saragozza" })).toHaveCount(0);
    await expect(page.getByText(/non trovata|404|could not be found|Questa pagina non c’è/i).first()).toBeVisible();
  });

  test("cookie: rifiuta, la scelta resta e si riapre dal piè di pagina", async ({ page, context }) => {
    await page.goto(PAGE);
    const banner = page.getByRole("dialog", { name: "Cookie" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Rifiuta" }).click();
    await expect(banner).toHaveCount(0);
    expect((await context.cookies()).find((c) => c.name === "tg_cookie")?.value).toBe("necessari");

    await page.reload();
    await expect(page.getByRole("dialog", { name: "Cookie" })).toHaveCount(0);

    await page.getByRole("button", { name: "Preferenze cookie" }).click();
    await page.getByRole("button", { name: "Scegli quali" }).click();
    const stats = page.getByRole("switch", { name: /Statistiche/ });
    await expect(stats).toHaveAttribute("aria-checked", "false");
    await stats.click();
    await page.getByRole("button", { name: "Salva le scelte" }).click();
    expect((await context.cookies()).find((c) => c.name === "tg_cookie")?.value).toBe("tutti");
  });
});

test.describe("Salone nell'app", () => {
  test("mostra l'indirizzo della pagina, le regole e le impostazioni del salone; /link porta qui", async ({ page }) => {
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo");
    await page.goto("/link");
    await expect(page).toHaveURL(/\/salone$/);
    await expect(page.getByRole("heading", { level: 1, name: "Barberia Saragozza" })).toBeVisible();
    for (const label of ["Pagina del salone", "Listino e orari", "Operatori", "Regole di prenotazione", "Email automatiche ai clienti"]) {
      await expect(page.getByRole("main").getByRole("link", { name: new RegExp(label) })).toBeVisible();
    }
    await expect(page.getByRole("main").getByRole("link", { name: /Email automatiche ai clienti/ })).toContainText("24 ore prima");
    await expect(page.getByTestId("salon-url")).toContainText("/barberia-saragozza");
    await expect(page.getByRole("button", { name: "Copia link" })).toBeVisible();
    await expect(visibleText(page, "Prenotazione online")).toBeVisible();
    await expect(page.getByRole("link", { name: "Apri la tua pagina" })).toHaveAttribute("href", /\/barberia-saragozza$/);
  });

  test("un salone nuovo ha subito la sua pagina", async ({ page, browser }) => {
    await freshOwner(page, "Barberia Nuova Pagina");
    await page.goto("/salone");
    await expect(page.getByTestId("salon-url")).toContainText("/barberia-nuova-pagina");
    const href = await page.getByRole("link", { name: "Apri la tua pagina" }).getAttribute("href");
    const visitor = await browser.newPage();
    await visitor.goto(new globalThis.URL(href!).pathname);
    await expect(visitor.getByRole("heading", { level: 1, name: "Barberia Nuova Pagina" })).toBeVisible();
    await visitor.close();
  });
});

test.describe("Pagina del salone (ridisegno del sito)", () => {
  test("intestazione: percorso, logo con le iniziali, stato, tre fatti, azioni", async ({ page, viewport }) => {
    await page.goto(PAGE);
    // il percorso c'è solo da computer (sul telefono è nascosto)
    if ((viewport?.width ?? 0) >= 900) await expect(page.getByRole("link", { name: "Barbieri a Bologna" })).toHaveAttribute("href", "/barbieri/bologna");
    await expect(page.getByRole("img", { name: "Logo di Barberia Saragozza" })).toBeVisible(); // senza logo: iniziali nello squircle
    await expect(page.getByText(/^(Aperto ora · chiude alle|Chiuso ·|In pausa ·)/).first()).toBeVisible();
    await expect(page.getByText("Chiuso dom. e lun.")).toBeVisible();
    await expect(page.getByText("3 barbieri")).toBeVisible();
    await expect(page.getByText("Andrea, Marco e Simone")).toBeVisible();
    await expect(page.getByRole("link", { name: "Indicazioni" })).toHaveAttribute("href", "#dove");
  });

  test("«Da sapere» mostra solo le righe compilate e «Disdette» dalle regole", async ({ page }) => {
    await page.goto(PAGE);
    const know = page.locator("#info");
    await expect(know.getByRole("heading", { name: "Da sapere" })).toBeVisible();
    await expect(know.getByText("In salone: contanti, carta e bancomat")).toBeVisible();
    await expect(know.getByText("Sì, fino a 12 anni")).toBeVisible();
    await expect(know.getByText("Gratis fino a 2 ore prima")).toBeVisible();
    await expect(know.getByText("Queste informazioni le scrive il salone.")).toBeVisible();
  });

  test("«Prenota» su un servizio apre il modulo su quel servizio (e salta alla scelta del barbiere)", async ({ page }) => {
    await page.goto(PAGE);
    await page.locator("#servizi").getByRole("link", { name: "Prenota Barba" }).click();
    const card = page.locator("#prenota-card");
    await expect(card.getByRole("heading", { name: "Con chi?" })).toBeVisible();
    await expect(card.getByText("Passo 2 di 4 · Barbiere")).toBeVisible();
  });

  test("un salone senza foto, senza logo e senza «Da sapere» è curato: iniziali, niente sezioni vuote", async ({ page }) => {
    await freshOwner(page, "Barberia Senza Foto");
    const [salon] = await adminSelect<{ slug: string }>("salons", "select=slug&name=eq.Barberia Senza Foto&order=created_at.desc&limit=1");
    await page.goto(`/${salon!.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: "Barberia Senza Foto" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Logo di Barberia Senza Foto" })).toHaveText("BS");
    await expect(page.locator("#foto")).toHaveCount(0);
    await expect(page.locator("#info")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Sezioni" }).getByRole("link", { name: "Da sapere" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Orari e indirizzo" })).toBeVisible();
  });

  test("«Condividi» copia l'indirizzo della pagina dove non c'è la condivisione del telefono", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    });
    await page.goto(PAGE);
    await page.getByRole("button", { name: "Condividi" }).click();
    await expect(page.getByRole("button", { name: "Indirizzo copiato" })).toBeVisible();
  });
});
