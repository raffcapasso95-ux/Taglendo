import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("Sito commerciale", () => {
  test("la pagina iniziale mostra il prodotto e porta a registrazione e accesso", async ({ page, isMobile }) => {
    await page.goto("/per-i-saloni");
    await expect(page).toHaveTitle(/Taglendo — Prenotazioni online e agenda per barbieri/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("La tua agenda online, sempre in tasca.");
    const hero = page.locator("[data-land-hero]");
    await expect(hero.getByRole("link", { name: "Prova gratis" })).toHaveAttribute("href", "/registrati");
    await expect(hero.getByText("Gratis durante la beta · Senza carta di credito · Zero commissioni")).toBeVisible();
    // le immagini ci sono davvero
    const loaded = await hero.locator("img").evaluateAll((imgs) => (imgs as HTMLImageElement[]).map((i) => i.complete && i.naturalWidth > 0));
    expect(loaded.every(Boolean)).toBe(true);
    for (const heading of ["Una giornata qualunque, con Taglendo.", "Pronto in tre passi.", "La pagina della tua barberia.", "Il quaderno, e poi Taglendo.", "Quanto costa?", "Domande frequenti"]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
    // le sezioni scartate dal ridisegno non ci sono più
    await expect(page.getByText(/Tre cose che smetti di fare|Online o al telefono: decidi tu/)).toHaveCount(0);
    // il menu delle sezioni c'è solo da computer
    if (!isMobile) await expect(page.getByRole("banner").getByRole("link", { name: "Funzioni" })).toHaveAttribute("href", "/per-i-saloni/funzioni");
  });

  test("Quanto costa: il contatore scende da 29 a 0 e nessun piano a pagamento è in pagina", async ({ page }) => {
    await page.goto("/per-i-saloni");
    const costo = page.locator("#costo");
    await costo.scrollIntoViewIfNeeded();
    await expect(costo.getByText("Zero euro")).toBeAttached(); // per i lettori di schermo; a vista c'è il contatore
    await expect(costo.getByText("Gratis durante la beta, con tutte le funzioni.")).toBeVisible();
    for (const [name, value] of [["Agenda per tutte le poltrone", "inclusa"], ["Fino a 3 barbieri", "inclusi"], ["Commissioni", "0 €"], ["Carta di credito", "non serve"]]) {
      await expect(costo.getByRole("listitem").filter({ hasText: name })).toContainText(value!);
    }
    // il contatore arriva a 0 (il valore visibile, non l'etichetta)
    await expect.poll(() => costo.locator("[aria-hidden=true]").first().innerText(), { timeout: 5000 }).toMatch(/^0\s*€/);
    await expect(page.getByText(/9,90|19,90/)).toHaveCount(0);
    await expect(page.getByText(/piano|abbonamento/i)).toHaveCount(0);
  });

  test("«Il quaderno, e poi Taglendo» si muove con le frecce della tastiera", async ({ page }) => {
    await page.goto("/per-i-saloni");
    const range = page.getByRole("slider", { name: "Confronta quaderno e Taglendo" });
    await range.scrollIntoViewIfNeeded();
    await expect(range).toHaveValue("50");
    await range.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(range).toHaveValue("49");
    await page.keyboard.press("End");
    await expect(range).toHaveValue("100");
    await expect(page.getByText("Prima", { exact: true })).toBeVisible();
    await expect(page.getByText("Con Taglendo", { exact: true })).toBeVisible();
  });

  test("le domande si aprono e rispondono secondo la beta", async ({ page }) => {
    await page.goto("/per-i-saloni");
    const q = page.getByText("Quanto costa davvero?");
    await q.scrollIntoViewIfNeeded();
    await expect(page.getByText(/Durante la beta Taglendo è gratis/)).toBeHidden();
    await q.click();
    await expect(page.getByText(/Durante la beta Taglendo è gratis, con tutte le funzioni e senza carta di credito/)).toBeVisible();
    await expect(page.getByText(/Aprono la pagina del salone dal telefono/)).toBeVisible(); // la prima è aperta
    await page.getByText("Posso far prenotare solo al telefono?").click();
    await expect(page.getByText(/Spegni la prenotazione online/)).toBeVisible();
  });

  test("la chiusura porta alla registrazione", async ({ page }) => {
    await page.goto("/per-i-saloni");
    const end = page.locator("#inizia");
    await end.scrollIntoViewIfNeeded();
    await expect(end.getByRole("heading", { name: "Il prossimo cliente può prenotare stasera." })).toBeVisible();
    await end.getByRole("link", { name: "Prova gratis" }).click();
    await expect(page).toHaveURL(/\/registrati/);
  });

  test("«La pagina della tua barberia»: quattro punti, una schermata vera del telefono e il link a Funzioni", async ({ page, isMobile }) => {
    await page.goto("/per-i-saloni");
    const section = page.locator("#pagina");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole("heading", { level: 2, name: "La pagina della tua barberia." })).toBeVisible();
    await expect(section.getByRole("listitem").filter({ hasText: /Servizi con il loro/ })).toBeVisible();
    await expect(section.getByRole("img", { name: /pagina di una barberia sul telefono/ })).toBeVisible();
    // i richiami sul telefono ci sono su computer; sul telefono si nascondono per non coprire la schermata
    await expect(section.getByText("Un tocco per prenotare")).toBeVisible({ visible: !isMobile });
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(section.getByRole("link", { name: "Tutte le funzioni" })).toHaveAttribute("href", "/per-i-saloni/funzioni");
    // la pagina d'esempio non esiste online: niente pulsante che porta a una pagina vuota
    await expect(page.getByRole("link", { name: /pagina d.esempio/i })).toHaveCount(0);
    // a Funzioni si arriva anche dall'apertura (anche sul telefono, dove non c'è il menu) e dal piè di pagina
    await expect(page.getByRole("link", { name: "Scopri tutte le funzioni" })).toHaveAttribute("href", "/per-i-saloni/funzioni");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Tutte le funzioni" })).toHaveAttribute("href", "/per-i-saloni/funzioni");
  });

  test("menu dei saloni (computer): le sezioni scorrono e si evidenziano, «Funzioni» è l'altra pagina e lo dice con la freccia", async ({ page, isMobile }) => {
    test.skip(isMobile, "la barra delle voci c'è da computer; sul telefono c'è il menu a tendina");
    await page.goto("/per-i-saloni");
    const bar = page.getByRole("banner").getByRole("navigation", { name: "Sezioni" });
    await expect(bar.getByRole("link")).toHaveCount(4);
    await expect(bar.getByRole("link", { name: "Funzioni" })).toHaveAttribute("href", "/per-i-saloni/funzioni");
    // nella home le sezioni sono link nella pagina
    await expect(bar.getByRole("link", { name: "Quanto costa" })).toHaveAttribute("href", "#costo");
    await bar.getByRole("link", { name: "Quanto costa" }).click();
    await expect(bar.getByRole("link", { name: "Quanto costa" })).toHaveAttribute("aria-current", "location");
    await expect(page.locator("#costo")).toBeInViewport();
    await expect(bar.getByRole("link", { name: "Come funziona" })).not.toHaveAttribute("aria-current", /./);
    // da lì a un'altra pagina e ritorno: in Funzioni «Funzioni» è la voce corrente e le sezioni riportano alla home
    await bar.getByRole("link", { name: "Funzioni" }).click();
    await expect(page).toHaveURL(/\/per-i-saloni\/funzioni$/);
    const bar2 = page.getByRole("banner").getByRole("navigation", { name: "Sezioni" });
    await expect(bar2.getByRole("link", { name: "Funzioni" })).toHaveAttribute("aria-current", "page");
    await expect(bar2.getByRole("link", { name: "Quanto costa" })).toHaveAttribute("href", "/per-i-saloni#costo");
    await page.getByRole("link", { name: "Taglendo per i saloni" }).first().click();
    await expect(page).toHaveURL(/\/per-i-saloni$/);
    // il passaggio ai clienti, da computer, sta nella testata
    await expect(page.getByRole("banner").getByRole("link", { name: "Cerchi un barbiere?" })).toHaveAttribute("href", "/");
  });

  test("menu a tendina (telefono e tablet): stesse voci, si apre, si chiude con Esc e toccando una voce", async ({ page, isMobile }) => {
    test.skip(!isMobile, "il menu a tendina c'è sotto i 1024 px");
    for (const [path, items, cta] of [
      ["/per-i-saloni", ["Come funziona", "Quanto costa", "Domande", "Funzioni"], "Prova gratis"],
      ["/", ["Taglio", "Barba", "Sfumatura", "Rasatura", "Bambini"], "Hai un salone?"],
    ] as const) {
      await page.goto(path);
      const open = page.getByRole("button", { name: "Apri il menu" });
      await expect(open).toHaveAttribute("aria-expanded", "false");
      await open.click();
      const menu = page.getByRole("dialog", { name: "Menu" });
      await expect(menu).toBeVisible();
      for (const label of items) await expect(menu.getByRole("link", { name: label, exact: true })).toBeVisible();
      await expect(menu.getByRole("link", { name: cta })).toBeVisible();
      // la X si vede (testo scuro su fondo chiaro) e la testata resta piena anche se la pagina si muove
      const x = page.getByRole("button", { name: "Chiudi il menu" }).first();
      const [fg, bg] = await x.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
      expect(fg).not.toBe(bg);
      expect(fg).not.toBe("rgb(255, 247, 240)"); // non panna su fondo chiaro
      await page.mouse.wheel(0, 40);
      await expect(page.locator("[data-land-header]")).toHaveAttribute("data-scrolled", "true");
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(page.getByRole("button", { name: "Apri il menu" })).toBeFocused();
    }
    // toccare una sezione chiude il menu e porta lì
    await page.goto("/per-i-saloni");
    await page.getByRole("button", { name: "Apri il menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Quanto costa" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
    await expect(page.locator("#costo")).toBeInViewport();
    // e «Cerchi un barbiere?» è nel menu
    await page.getByRole("button", { name: "Apri il menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Cerchi un barbiere?" })).toHaveAttribute("href", "/");
  });

  test("Funzioni: la pagina nuova, con le email vere, i permessi e cosa Taglendo non fa", async ({ page, isMobile }) => {
    await page.goto("/per-i-saloni/funzioni");
    await expect(page).toHaveTitle("Funzioni · Taglendo per i saloni");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tutto quello che c’è dentro Taglendo.");
    // la voce «Funzioni» della testata è quella corrente (il menu delle sezioni c'è solo da computer)
    if (!isMobile) await expect(page.getByRole("banner").getByRole("link", { name: "Funzioni" })).toHaveAttribute("aria-current", "page");
    // la barra delle sezioni porta alle quattro aree e alle domande
    const nav = page.getByRole("navigation", { name: "Sezioni della pagina" });
    for (const [label, id] of [["Agenda", "agenda"], ["La tua pagina", "pagina"], ["Prenotazioni", "prenotazioni"], ["Il tuo team", "team"], ["Tutto il resto", "tutto"], ["Cosa non fa", "nonfa"]]) {
      await expect(nav.getByRole("link", { name: label })).toHaveAttribute("href", `#${id}`);
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
    // le email sono quelle vere dell'app
    const mails = page.getByRole("list", { name: "Le email che partono da sole" });
    await expect(mails.getByText("Il tuo codice: 482 913")).toBeVisible();
    await expect(mails.getByText("Confermato: sabato 14 novembre alle 9:30")).toBeVisible();
    await expect(mails.getByText("Nuova prenotazione: Gianni Ferraro · sab 9:30")).toBeVisible();
    await expect(mails.getByText("Domani alle 9:30 da Barberia Porta Nuova")).toBeVisible();
    // chi può fare cosa
    const table = page.getByRole("table", { name: "Cosa può fare chi" });
    await expect(table.getByRole("row", { name: /Cambia listino, orari e regole/ })).toContainText("no");
    await expect(table.getByRole("row", { name: /Vede l’agenda di tutti/ })).toContainText("se lo attivi");
    // le domande sulle impostazioni (la prima è aperta) e cosa non fa
    await expect(page.getByText(/Scegli il preavviso minimo: 30 minuti, 2 ore o il giorno prima/)).toBeVisible();
    await page.getByText("Posso nascondere i prezzi?").click();
    await expect(page.getByText(/La pagina mostra servizi e durate senza prezzi/)).toBeVisible();
    for (const item of ["Pagamenti online", "SMS", "Un’app da scaricare", "Catene e grandi saloni"]) await expect(page.locator("#nonfa").getByText(item, { exact: true })).toBeVisible();
    await page.locator("#inizia").getByRole("link", { name: "Prova gratis" }).click();
    await expect(page).toHaveURL(/\/registrati/);
  });

  test("chi ha già una sessione trova il suo tondo con il menu dell'account", async ({ page }) => {
    await page.goto("/per-i-saloni");
    await expect(page.getByRole("banner").getByRole("link", { name: "Prova gratis" })).toBeVisible();
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo");
    await page.goto("/per-i-saloni");
    const banner = page.getByRole("banner");
    await expect(banner.getByRole("link", { name: "Accedi", exact: true })).toHaveCount(0);
    await expect(banner.getByRole("link", { name: "Prova gratis" })).toHaveCount(0);
    // nella sezione in alto: niente «Prova gratis», si torna all'agenda
    await expect(page.getByRole("main").getByRole("link", { name: "Apri l’agenda" })).toHaveAttribute("href", "/agenda");
    await expect(page.getByText("Bentornato, Andrea")).toBeVisible();

    const trigger = banner.getByRole("button", { name: /Il tuo account/ });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(banner.getByText("Titolare · Barberia Saragozza")).toBeVisible();
    await expect(banner.getByRole("link", { name: "Apri l’agenda" })).toHaveAttribute("href", "/agenda");
    await expect(banner.getByRole("link", { name: "Impostazioni" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();

    // anche nelle pagine del sito (testata chiara)
    await page.goto("/privacy");
    await page.getByRole("banner").getByRole("button", { name: /Il tuo account/ }).click();
    await page.getByRole("banner").getByRole("link", { name: "Apri l’agenda" }).click();
    await expect(page).toHaveURL(/\/agenda$/);
  });

  test("il banner cookie del sito si può rifiutare e riaprire dal piè di pagina", async ({ page, context }) => {
    await page.goto("/per-i-saloni");
    const banner = page.getByRole("dialog", { name: "Cookie" });
    await expect(banner.getByText("Usiamo cookie tecnici per far funzionare il sito.")).toBeVisible();
    await banner.getByRole("button", { name: "Rifiuta" }).click();
    expect((await context.cookies()).find((c) => c.name === "tg_cookie")?.value).toBe("necessari");
    await page.getByRole("contentinfo").getByRole("button", { name: "Preferenze cookie" }).click();
    await expect(page.getByRole("dialog", { name: "Cookie" })).toBeVisible();
  });

  test("il piè di pagina porta alle pagine legali e in fondo dice solo «© 2026 Taglendo»", async ({ page }) => {
    await page.goto("/per-i-saloni");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/privacy");
    await expect(footer.getByRole("link", { name: "Termini", exact: true })).toHaveAttribute("href", "/termini");
    await expect(footer.getByRole("link", { name: "Cookie", exact: true })).toHaveAttribute("href", "/cookie");
    await expect(footer.getByRole("link", { name: "aiuto@taglendo.it" })).toHaveAttribute("href", "mailto:aiuto@taglendo.it");
    await expect(footer.getByText("© 2026 Taglendo", { exact: true })).toBeVisible();
    await expect(footer.getByText(/^\[.+\]$/)).toHaveCount(0); // niente dati segnaposto per ora
  });

  test("le pagine legali hanno indice, avviso di bozza e testi", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Informativa privacy" })).toBeVisible();
    await expect(page.getByText("Bozza da far verificare")).toBeVisible();
    await expect(page.getByRole("heading", { name: "1. Chi tratta i dati" })).toBeVisible();
    await page.getByRole("navigation", { name: "In questa pagina" }).getByRole("link", { name: "I tuoi diritti" }).click();
    await expect(page).toHaveURL(/#diritti$/);

    await page.goto("/termini");
    await expect(page.getByRole("heading", { level: 1, name: "Termini di servizio" })).toBeVisible();
    await expect(page.getByText("Durante la beta Taglendo è gratuito")).toBeVisible();
    await expect(page.getByText(/9,90/)).toHaveCount(0);

    await page.goto("/cookie");
    await expect(page.getByRole("heading", { level: 1, name: "Cookie" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "tg_cookie" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Durata" })).toBeVisible();
  });

  test("sitemap, robots e anteprima social", async ({ request, page }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    expect(xml).toMatch(/<loc>[^<]*\/<\/loc>/);
    expect(xml).toContain("/privacy</loc>");
    expect(xml).toContain("/barberia-saragozza</loc>");
    expect(xml).toContain("/per-i-saloni</loc>");
    expect(xml).toContain("/per-i-saloni/funzioni</loc>");
    expect(xml).toContain("/barbieri/bologna</loc>");
    expect(xml).not.toContain("/agenda");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /agenda");
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
    expect((await request.get("/og.png")).status()).toBe(200);
    await page.goto("/per-i-saloni");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og\.png$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /agenda online per barberie/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/per-i-saloni$/);
  });

  test("sul telefono la barra in basso ricorda di provare", async ({ page }, info) => {
    await page.goto("/per-i-saloni");
    const bar = page.getByText("Gratis durante la beta").filter({ visible: true });
    if (info.project.name === "telefono") {
      await page.locator("#costo").scrollIntoViewIfNeeded();
      await expect(page.getByText("Senza carta di credito", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    }
    await expect(bar.first()).toBeVisible();
  });

  test("la testata resta in vista mentre si scorre e diventa prugna (si legge anche sulle sezioni chiare)", async ({ page }) => {
    await page.goto("/per-i-saloni", { waitUntil: "networkidle" });
    const header = page.getByRole("banner");
    const bg = () => header.evaluate((h) => getComputedStyle(h).backgroundColor);
    expect(await bg()).toBe("rgba(0, 0, 0, 0)"); // sull'apertura è trasparente, sopra la foto
    await page.locator("#costo").scrollIntoViewIfNeeded();
    await expect(header).toHaveAttribute("data-scrolled", "true");
    await expect.poll(bg).not.toBe("rgba(0, 0, 0, 0)"); // dopo la transizione del colore
    const top = await header.evaluate((h) => Math.round(h.getBoundingClientRect().top));
    expect(top).toBe(0);
    await expect(header.getByRole("link", { name: "Prova gratis" })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).toHaveAttribute("data-scrolled", "false");
  });
});
