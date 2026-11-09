import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { bookNewClient, freshOwner, nextOpenDay, openAppointment } from "./agenda-helpers";
import { adminSelect } from "./helpers";

/** Controllo automatico (axe) delle regole WCAG A e AA: nessuna violazione. */
async function scan(page: Page, label: string) {
  await page.waitForLoadState("networkidle").catch(() => {});
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const report = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")}  ${n.html.slice(0, 220)}  ${JSON.stringify(n.any.map((a) => a.data)).slice(0, 200)}`).join("\n  ")}`);
  expect.soft(report, `${label}\n${report.join("\n")}`).toEqual([]);
}

test.describe("Accessibilità: pagine pubbliche", () => {
  for (const path of ["/", "/accedi", "/registrati", "/password", "/privacy", "/termini", "/cookie"]) {
    test(`axe su ${path}`, async ({ page }) => {
      await page.goto(path);
      await scan(page, path);
    });
  }

  test("axe sulla pagina del salone", async ({ page }) => {
    const [salon] = await adminSelect<{ slug: string }>("salons", "select=slug&deleted_at=is.null&booking_online=eq.true&limit=1&order=created_at.asc");
    await page.goto(`/${salon!.slug}`);
    await scan(page, "pagina del salone");
  });
});

test.describe("Accessibilità: gestionale", () => {
  test("axe su agenda, clienti, listino, impostazioni, pagina, profilo, link, statistiche", async ({ page }) => {
    await freshOwner(page, "Barberia Accessibile");
    for (const path of ["/agenda", "/clienti", "/listino", "/impostazioni", "/impostazioni/regole", "/impostazioni/avvisi", "/impostazioni/pagina", "/profilo", "/link", "/statistiche", "/statistiche?periodo=giorno"]) {
      await page.goto(path);
      await scan(page, path);
    }
  });
});

test.describe("Accessibilità: finestre, tastiera, movimento", () => {
  test("axe con la finestra «Nuovo appuntamento» aperta; Esc la chiude e il focus torna al pulsante", async ({ page }) => {
    await freshOwner(page, "Barberia Tastiera");
    await page.goto("/agenda");
    const open = page.getByRole("button", { name: /^\+ (Nuovo appuntamento|Appuntamento)$/ }).filter({ visible: true });
    await open.focus();
    await page.keyboard.press("Enter");
    const dlg = page.getByRole("dialog");
    await expect(dlg).toBeVisible();
    await scan(page, "finestra nuovo appuntamento");
    // il focus resta dentro la finestra
    for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("dialog"))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dlg).toBeHidden();
    await expect(open).toBeFocused();
  });

  test("ogni controllo raggiunto con Tab mostra l’anello del focus", async ({ page }) => {
    await page.goto("/accedi");
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      seen.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return "";
          // il campo di testo mostra il focus sul suo riquadro (bordo scuro + ombra), non sull'<input>
          const marked = (e: Element) => {
            const s = getComputedStyle(e);
            return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
          };
          const ring = marked(el) || (el.tagName === "INPUT" && !!el.parentElement && marked(el.parentElement));
          return ring ? "" : el.outerHTML.slice(0, 160);
        }),
      );
    }
    expect(seen.filter(Boolean)).toEqual([]);
  });

  test("con «riduci movimento» le animazioni si azzerano", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/accedi");
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll("a, button, input")].map((el) => {
        const s = getComputedStyle(el);
        return Math.max(...s.transitionDuration.split(",").map(parseFloat), ...s.animationDuration.split(",").map(parseFloat));
      }),
    );
    expect(durations.length).toBeGreaterThan(0);
    expect(Math.max(...durations)).toBeLessThanOrEqual(0.001);
  });

  test("la pagina del salone ha un solo h1, i campi hanno etichetta e c’è la lingua", async ({ page }) => {
    const [salon] = await adminSelect<{ slug: string }>("salons", "select=slug&deleted_at=is.null&booking_online=eq.true&limit=1&order=created_at.asc");
    await page.goto(`/${salon!.slug}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await expect(page.locator("h1")).toHaveCount(1);
  });
});

test.describe("Accessibilità: percorsi nuovi del ridisegno", () => {
  test("axe sui passi della prenotazione pubblica", async ({ page }) => {
    await page.goto("/barberia-saragozza");
    const banner = page.getByRole("dialog", { name: "Cookie" });
    await banner.waitFor({ timeout: 5000 }).catch(() => {});
    if (await banner.isVisible()) await banner.getByRole("button", { name: "Rifiuta" }).click();
    const card = page.locator("#prenota-card");
    // ogni passo entra con una breve animazione: si controlla a passo fermo, non a metà dissolvenza
    const settle = () => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
    await card.getByRole("button", { name: /^Barba/ }).click();
    await settle();
    await scan(page, "salone: con chi");
    await card.getByRole("button", { name: /^Chi è libero prima/ }).click();
    await expect(card.getByRole("button", { name: /Prima disponibilità/ })).toBeVisible();
    await settle();
    await scan(page, "salone: quando");
    await card.getByRole("button", { name: /Altre/ }).click();
    await settle();
    await scan(page, "salone: calendario");
    await card.getByRole("button", { name: /Prima disponibilità/ }).click();
    await settle();
    await scan(page, "salone: i tuoi dati");
  });

  test("axe su Sposta appuntamento e sulla scheda dell'appuntamento", async ({ page }) => {
    const day = nextOpenDay();
    await freshOwner(page, "Barberia Axe Sposta");
    await page.goto(`/agenda?g=${day}`);
    await bookNewClient(page, "Mario Verdi", day, "10:00");
    await expect(page.getByText("Appuntamento fissato").filter({ visible: true })).toBeVisible();
    await openAppointment(page, "Mario Verdi");
    const settle = () => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
    await settle();
    await scan(page, "dettaglio appuntamento");
    await page.getByRole("dialog").getByRole("button", { name: "Sposta", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Sposta appuntamento" })).toBeVisible();
    await settle();
    await scan(page, "sposta appuntamento");
  });
});
