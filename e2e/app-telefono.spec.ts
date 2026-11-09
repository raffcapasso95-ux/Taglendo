import { expect, test, type Page } from "@playwright/test";
import { bookNewClient, freshOwner, nextOpenDay, romeNow } from "./agenda-helpers";

/** Il sito sul telefono si comporta come un'app: viewport, campi, scorrimento, tocco. Solo profilo «telefono». */
test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1024, "solo telefono");

/** Uno scorrimento vero con il dito (eventi di tocco del browser, non click). */
async function swipe(page: Page, from: [number, number], to: [number, number]) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from[0], y: from[1] }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from[0] + ((to[0] - from[0]) * i) / 6, y: from[1] + ((to[1] - from[1]) * i) / 6 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test.describe("Taglendo sul telefono", () => {
  test("la pagina dichiara lo schermo intero, la tastiera e il solo tema chiaro", async ({ page }) => {
    await page.goto("/accedi");
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toContain("viewport-fit=cover");
    expect(viewport).toContain("interactive-widget=resizes-content");
    expect(viewport).not.toMatch(/user-scalable|maximum-scale/); // lo zoom resta possibile
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "light");
  });

  test("i campi sono almeno da 16 px, così il telefono non ingrandisce la pagina", async ({ page }) => {
    const small = async (where: string) => {
      const sizes = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([type=checkbox]), textarea, select")]
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ name: el.getAttribute("name") ?? el.getAttribute("type") ?? el.tagName, px: parseFloat(getComputedStyle(el).fontSize) })),
      );
      expect(sizes.filter((s) => s.px < 16), where).toEqual([]);
      return sizes.length;
    };
    await page.goto("/accedi");
    expect(await small("accesso")).toBeGreaterThan(0);
    await page.goto("/registrati");
    expect(await small("registrazione")).toBeGreaterThan(0);
    await freshOwner(page, "Barberia Campi Grandi");
    await page.goto("/clienti");
    await small("rubrica");
    await page.goto("/profilo");
    await small("profilo");
    await page.goto("/impostazioni/regole");
    await small("regole");
  });

  test("nel gestionale la pagina non rimbalza né si ricarica tirando; le pagine pubbliche sì", async ({ page }) => {
    await freshOwner(page, "Barberia Senza Rimbalzo");
    await page.goto("/agenda");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY)).toBe("none");
    await page.goto("/privacy"); // pagina pubblica (da collegati /accedi rimanda all'agenda)
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY)).not.toBe("none");
  });

  test("tenere premuto un pulsante non seleziona il testo; i contenuti restano selezionabili", async ({ page }) => {
    await freshOwner(page, "Barberia Pressione Lunga");
    await page.goto("/agenda");
    const tab = page.getByRole("button", { name: "Menu" }).filter({ visible: true }).first();
    expect(await tab.evaluate((el) => getComputedStyle(el).userSelect)).toBe("none");
    expect(await page.locator("body").evaluate((el) => getComputedStyle(el).userSelect)).not.toBe("none");
  });

  test("scorrendo l'agenda a sinistra si va al giorno dopo, a destra al giorno prima; in verticale no", async ({ page }) => {
    await freshOwner(page, "Barberia Scorri Giorni");
    const day = nextOpenDay();
    await page.goto(`/agenda?g=${day}`);
    await bookNewClient(page, "Cliente Scorri", day, "10:00");
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();
    const list = page.getByText("Cliente Scorri", { exact: true }).filter({ visible: true }).first();
    await expect(list).toBeVisible();
    const box = (await list.boundingBox())!;
    const y = box.y + box.height / 2;

    const next = new Date(new Date(`${day}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
    const prev = new Date(new Date(`${day}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);

    await swipe(page, [300, y], [310, y + 180]); // in giù: niente
    await page.waitForTimeout(400);
    expect(page.url()).toContain(`g=${day}`);

    await swipe(page, [320, y], [60, y]); // verso sinistra
    await expect(page).toHaveURL(new RegExp(`g=${next}`));

    await swipe(page, [60, y], [330, y]); // verso destra: torna indietro
    await expect(page).toHaveURL(new RegExp(`g=${day}`));
    await swipe(page, [60, y], [330, y]);
    // il giorno di oggi ha l'indirizzo senza data
    await expect(page).toHaveURL(prev === romeNow().date ? /\/agenda$/ : new RegExp(`g=${prev}`));
  });

  test("il «Menu» in alto apre il pannello con le sezioni, il profilo e «Esci»; Esc lo chiude", async ({ page }) => {
    await freshOwner(page, "Barberia Menu Telefono");
    await page.goto("/agenda");
    await expect(page.locator("header").getByText("Agenda", { exact: true }).first()).toBeVisible(); // nome della sezione
    const opener = page.getByRole("button", { name: "Menu" });
    await expect(opener).toHaveAttribute("aria-expanded", "false");
    await opener.click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    for (const name of ["Agenda", "Clienti", "Statistiche", "Listino e orari", "Link di prenotazione", "Impostazioni", "Copia il link di prenotazione", "Esci"]) {
      await expect(menu.getByText(name, { exact: true })).toBeVisible();
    }
    await expect(menu.getByText(/^Titolare · Barberia Menu Telefono$/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("a 320 px i due pulsanti fissi dell'agenda stanno nello schermo e il marchio ha un'area di tocco da 44 px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await freshOwner(page, "Barberia Schermo Stretto");
    await page.goto("/agenda");
    for (const name of ["In negozio ora", "+ Appuntamento"]) {
      const right = await page.getByRole("button", { name }).evaluate((b) => Math.round(b.getBoundingClientRect().right));
      expect(right, name).toBeLessThanOrEqual(320);
    }
    const logo = await page.getByRole("link", { name: /Taglendo, vai all’agenda/ }).evaluate((a) => ({ w: a.getBoundingClientRect().width, h: a.getBoundingClientRect().height }));
    expect(logo.w).toBeGreaterThanOrEqual(44);
    expect(logo.h).toBeGreaterThanOrEqual(44);
  });
});
