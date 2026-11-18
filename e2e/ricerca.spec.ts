import { expect, test } from "@playwright/test";
import { adminSelect, adminUpdate, signIn } from "./helpers";

const listed = async () => (await adminSelect<{ listed: boolean }>("salons", "select=listed&slug=eq.barberia-saragozza"))[0]!.listed;

// il salone demo è a Bologna e compare nella ricerca; altre prove possono aggiungere saloni, quindi niente conteggi esatti
const showDemo = () => adminUpdate("salons", "slug=eq.barberia-saragozza", { listed: true });

// La ricerca mostra al massimo 40 saloni, dal più vicino: le altre prove ne creano a decine, tutti a Bologna.
// Qui si tolgono dalla ricerca (restano nel database) così il salone demo è sempre nell'elenco.
test.beforeAll(async () => {
  await adminUpdate("salons", "slug=neq.barberia-saragozza", { listed: false });
});

test.describe("Ricerca dei saloni", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await showDemo();
    // il banner dei cookie (che blocca la pagina finché non si sceglie) ha le sue prove: qui è già scelto
    await context.addCookies([{ name: "tg_cookie", value: "necessari", url: baseURL! }]);
  });

  test("dalla home: scrivo la città, scelgo il suggerimento, vedo il salone e lo apro", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Il tuo barbiere, quando vuoi tu.");
    await expect(page.getByRole("banner").getByRole("link", { name: "Hai un salone?" })).toHaveAttribute("href", "/per-i-saloni");
    const box = page.getByRole("combobox", { name: "Dove?" });
    await box.fill("bolo");
    await page.getByRole("option", { name: /^Bologna\s*BO$/ }).click();
    await expect(page).toHaveURL(/\/cerca\?dove=Bologna$/);
    await expect(page.getByRole("heading", { level: 1, name: "Barbieri a Bologna" })).toBeVisible();
    const card = page.locator('[data-salon="barberia-saragozza"]');
    await expect(card).toContainText(/\d,\d km/); // la distanza
    await expect(card).toContainText(/(Aperto · fino alle \d\d:\d\d|Chiuso ora)/); // aperto o chiuso adesso
    await expect(card.getByRole("list", { name: "Servizi" })).toContainText(/\d+\s€/); // i servizi con il prezzo
    // i prossimi orari liberi: pulsanti che portano al salone
    await expect(card.getByRole("link", { name: /^Prenota da Barberia Saragozza: / }).first()).toHaveAttribute("href", "/barberia-saragozza");
    // le città con saloni in fondo alla home
    await page.goto("/");
    await expect(page.getByRole("link", { name: /^Bologna\s*\d+ barberi[ae]/ })).toHaveAttribute("href", "/barbieri/bologna");
    // le grandi città ci sono sempre, anche senza saloni
    await expect(page.getByRole("link", { name: "Barbieri a Roma" })).toHaveAttribute("href", "/barbieri/roma");
    // i saloni arrivati da poco, con la foto
    await expect(page.getByRole("heading", { name: "Appena arrivate su Taglendo" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Barberia Saragozza/ }).first()).toHaveAttribute("href", "/barberia-saragozza");
    await page.goto("/cerca?dove=Bologna");
    await page.locator('[data-salon="barberia-saragozza"]').getByRole("link", { name: "Barberia Saragozza", exact: true }).click();
    await expect(page).toHaveURL(/\/barberia-saragozza$/, { timeout: 30_000 }); // in sviluppo la pagina si compila al primo giro
  });

  test("servizio, città e giorno: la barra cerca con tutti e tre, e basta anche la città", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: "Cosa ti serve?" }).click();
    await page.getByRole("option", { name: "Barba", exact: true }).click();
    await page.getByRole("combobox", { name: "Dove?" }).fill("bolo");
    await expect(page.getByRole("option", { name: /^Bologna\s*BO$/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Quando:/ }).click();
    // il salone demo è chiuso domenica e lunedì: si sceglie il prossimo martedì, così ci sono sempre orari liberi
    const tuesday = (() => {
      const d = new Date();
      d.setDate(d.getDate() + ((9 - d.getDay()) % 7 || 7));
      return d.toISOString().slice(0, 10);
    })();
    const pop = page.getByRole("dialog", { name: "Scegli il giorno" });
    await pop.getByRole("button", { name: "Altra data" }).click();
    await pop.locator(`[data-date="${tuesday}"]`).click();
    await expect(page.getByRole("button", { name: /^Quando: / })).not.toContainText("Qualsiasi data");
    // «bolo» + Cerca: si prende la prima città suggerita
    await page.getByRole("button", { name: "Cerca", exact: true }).click();
    await expect(page).toHaveURL(/\/cerca\?servizio=Barba&dove=Bologna&data=\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Barba a Bologna · (domani|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)/);
    // nelle schede i servizi cercati vengono per primi
    const first = page.locator("[data-salon]").first();
    await expect(first.getByRole("list", { name: "Servizi" }).getByRole("listitem").first()).toContainText(/Barba/);
    // senza città: la barra lo chiede
    await page.goto("/");
    await page.getByRole("combobox", { name: "Cosa ti serve?" }).fill("Taglio");
    await page.getByRole("button", { name: "Cerca", exact: true }).click();
    await expect(page.getByText("Scrivi dove cerchi, o usa «Vicino a me».")).toBeVisible();
    // dai riquadri «Cosa ti serve?» il servizio arriva già scelto
    await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: /^Barba/ }).first().click();
    await expect(page).toHaveURL(/\/cerca\?servizio=Barba$/);
    // i campi possono stare dietro la riga di riepilogo (telefono, con risultati)
    const editBtn = page.getByRole("button", { name: /Modifica$/ });
    if (await editBtn.isVisible()) await editBtn.click();
    await expect(page.getByRole("combobox", { name: "Servizio" })).toHaveValue("Barba");
    await expect(page.getByText(/Scrivi una città o usa «Vicino a me»/)).toBeVisible();
    // senza luogo la pagina non è vuota: i saloni di tutta Italia con quel servizio, senza distanze
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Barba in tutta Italia");
    await expect(page.locator("[data-salon]").first()).toBeVisible();
    await expect(page.locator("[data-salon]").first().getByText(/\d km|\d m$/)).toHaveCount(0);
  });

  test("risultati: elenco compatto o griglia (su computer), barra di ricerca nella fascia sotto il titolo", async ({ page, isMobile }) => {
    await page.goto("/cerca?dove=Bologna");
    const band = page.getByRole("region", { name: "La tua ricerca" });
    await expect(band.getByRole("heading", { level: 1 })).toBeVisible();
    // sul telefono i campi stanno dietro la riga di riepilogo («Modifica»)
    if (isMobile) await band.getByRole("button", { name: /Modifica$/ }).click();
    await expect(band.getByRole("combobox", { name: "Servizio" })).toBeVisible();
    await expect(band.getByRole("button", { name: "Filtri" })).toBeVisible();
    if (isMobile) return await expect(page.getByRole("group", { name: "Come vedere i risultati" })).toBeHidden();
    await page.getByRole("group", { name: "Come vedere i risultati" }).getByRole("button", { name: "Griglia" }).click();
    await expect(page.getByRole("group", { name: "Come vedere i risultati" }).getByRole("button", { name: "Griglia" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-salon="barberia-saragozza"]')).toBeVisible();
    await expect(page.getByRole("region", { name: "Mappa dei saloni" })).toBeHidden();
  });

  test("lontano da tutto: niente saloni entro 30 km, si mostrano i più vicini; una città senza nome: lo dice", async ({ page }) => {
    await page.goto("/cerca?dove=Modena");
    await expect(page.getByText("Nessun salone entro 30 km da Modena. Ecco i più vicini.")).toBeVisible();
    await expect(page.locator('[data-salon="barberia-saragozza"]')).toBeVisible();
    await page.goto("/cerca?dove=Napoli");
    await expect(page.getByText("Nessun salone su Taglendo vicino a Napoli, per ora.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sei un barbiere? Porta qui il tuo salone" })).toHaveAttribute("href", "/per-i-saloni");
    await page.goto("/cerca?dove=Xyzabc");
    await expect(page.getByText(/Non trovo «Xyzabc»/)).toBeVisible();
  });

  test("dalla pagina del salone si torna ai risultati (con i filtri), o alla home se si arriva da fuori", async ({ page, browser }) => {
    await page.goto("/cerca?dove=Bologna&servizio=Barba");
    await page.locator('[data-salon="barberia-saragozza"]').getByRole("link", { name: "Barberia Saragozza", exact: true }).click();
    await expect(page).toHaveURL(/\/barberia-saragozza$/, { timeout: 30_000 });
    const back = page.getByRole("link", { name: "Torna ai risultati" });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/cerca\?dove=Bologna&servizio=Barba$/);
    await expect(page.locator('[data-salon="barberia-saragozza"]')).toBeVisible();

    // arrivando da fuori (scheda nuova, nessuna ricerca): si torna alla home
    const fresh = await browser.newContext();
    const direct = await fresh.newPage();
    await direct.goto("/barberia-saragozza");
    const home = direct.getByRole("link", { name: "Torna alla home" });
    await expect(home).toBeVisible();
    await expect(home).toHaveAttribute("href", "/");
    await fresh.close();
  });

  test("dal confronto con altri siti: giorni rapidi, ricerca ridotta sul telefono, «Mostra sulla mappa» e dati strutturati", async ({ page, isMobile }) => {
    await page.goto("/cerca?dove=Bologna");
    // la riga dei giorni: «Qualsiasi giorno» è scelto; toccando un giorno la ricerca si aggiorna con la data
    const days = page.getByRole("navigation", { name: "Giorno" });
    await expect(days.getByRole("link", { name: "Qualsiasi giorno" })).toHaveAttribute("aria-current", "true");
    await days.getByRole("link", { name: "Domani" }).click();
    await expect(page).toHaveURL(/\/cerca\?dove=Bologna&data=\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole("navigation", { name: "Giorno" }).getByRole("link", { name: "Domani" })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("domani");

    // dati strutturati: l'elenco dei saloni e il percorso
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toContain("ItemList");
    expect(ld).toContain("BreadcrumbList");
    expect(ld).toContain("/barberia-saragozza");

    if (isMobile) {
      // i tre campi sono ridotti a una riga: «Modifica» li apre
      const edit = page.getByRole("button", { name: /(Modifica|Chiudi)$/ });
      await expect(edit).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByRole("combobox", { name: "Servizio" })).toBeHidden();
      await edit.click();
      await expect(page.getByRole("combobox", { name: "Servizio" })).toBeVisible();
      await edit.click();
      // «Mostra sulla mappa» passa alla mappa con la scheda del salone aperta
      await page.locator('[data-salon="barberia-saragozza"]').getByRole("button", { name: "Mostra sulla mappa" }).click();
      await expect(page.getByRole("region", { name: "Mappa dei saloni" })).toBeVisible();
      await expect(page.getByRole("group", { name: "Barberia Saragozza" })).toBeVisible();
    } else {
      // da computer i campi ci sono sempre
      await expect(page.getByRole("combobox", { name: "Servizio" })).toBeVisible();
      await page.locator('[data-salon="barberia-saragozza"]').getByRole("button", { name: "Mostra sulla mappa" }).click();
      await expect(page.getByRole("group", { name: "Barberia Saragozza" })).toBeVisible();
    }
  });

  test("da computer: pagina a tutta larghezza, scorre la pagina (non l'elenco) e la mappa resta ferma sotto la testata", async ({ page, isMobile }) => {
    test.skip(isMobile, "su telefono elenco e mappa si alternano");
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto("/cerca?dove=Bologna");
    // a tutta larghezza: il titolo sta al bordo, non in una colonna centrata
    const left = await page.getByRole("heading", { level: 1 }).evaluate((el) => Math.round(el.getBoundingClientRect().left));
    expect(left).toBeLessThanOrEqual(32);
    // l'elenco non scorre per conto suo
    expect(await page.locator("[data-list-col]").evaluate((el) => getComputedStyle(el).overflowY)).toBe("visible");
    // la mappa è «sticky»: scorrendo una lista lunga resta sotto la testata (con pochi saloni non c'è da scorrere, ma lo stile è lo stesso)
    const pane = page.getByRole("region", { name: "Mappa dei saloni" }).locator("xpath=..");
    await expect(pane).toBeVisible();
    const style = await pane.evaluate((el) => ({ position: getComputedStyle(el).position, top: parseFloat(getComputedStyle(el).top) }));
    expect(style.position).toBe("sticky");
    expect(style.top).toBeGreaterThanOrEqual(68); // sotto la testata fissa
  });

  test("«Vicino a me» usa la posizione del telefono", async ({ browser }) => {
    const ctx = await browser.newContext({ geolocation: { latitude: 44.4949, longitude: 11.3426 }, permissions: ["geolocation"] });
    const page = await ctx.newPage();
    await page.goto("/cerca");
    await page.getByRole("combobox", { name: "Dove" }).click();
    await page.getByRole("option", { name: /Vicino a me/ }).click();
    await expect(page).toHaveURL(/\/cerca\?lat=44\.49\d*&lng=11\.34\d*/);
    await expect(page.getByRole("heading", { level: 1, name: "Barbieri vicino a te · Bologna" })).toBeVisible();
    await expect(page.locator('[data-salon="barberia-saragozza"]')).toBeVisible();
    // il campo Dove lo dice, e «Aggiorna» cerca ancora vicino a te (senza cambiare luogo)
    // sul telefono i campi stanno dietro la riga di riepilogo («Modifica»)
    const edit = page.getByRole("button", { name: /Modifica$/ });
    if (await edit.isVisible()) await edit.click();
    const dove = page.getByRole("combobox", { name: "Dove" });
    await expect(dove).toHaveValue(/^Vicino a te/);
    await dove.press("Enter");
    await expect(page).toHaveURL(/\/cerca\?.*lat=44\.49\d*&lng=11\.34\d*/);
    // se si scrive un'altra città, vale quella
    await dove.fill("Torino");
    await dove.press("Enter");
    await expect(page).toHaveURL(/dove=Torino/);
    await expect(page).not.toHaveURL(/lat=/);
    await ctx.close();
  });

  test("pagina per città: titolo per Google, indirizzo unico, città inesistente «non trovata»", async ({ page, request }) => {
    await page.goto("/barbieri/bologna");
    await expect(page).toHaveTitle("Barbieri a Bologna · Prenota online · Taglendo");
    await expect(page.locator('[data-salon="barberia-saragozza"]')).toBeVisible();
    await page.goto("/barbieri/BOLOGNA");
    await expect(page).toHaveURL(/\/barbieri\/bologna$/);
    // città inesistente: la pagina «non trovata», fuori dai motori di ricerca (in produzione la risposta è a flusso, come per i saloni)
    await page.goto("/barbieri/non-esiste");
    await expect(page.getByRole("link", { name: "Torna alla pagina iniziale" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    const map = await request.get("/sitemap.xml");
    const xml = await map.text();
    expect(xml).toContain("/barbieri/bologna");
    expect(xml).toContain("/per-i-saloni");
  });

  test("elenco e mappa: sul telefono si passa alla mappa, su computer stanno insieme", async ({ page, isMobile }) => {
    await page.goto("/cerca?dove=Bologna");
    const salons = await page.locator("[data-salon]").count(); // quanti saloni nell'elenco
    expect(salons).toBeGreaterThan(0);
    const map = page.getByRole("region", { name: "Mappa dei saloni" });
    if (isMobile) {
      await expect(map).toBeHidden();
      await page.getByRole("button", { name: "Mappa", exact: true }).click();
      await expect(map).toBeVisible();
      await page.getByRole("button", { name: "Elenco" }).click();
      await expect(map).toBeHidden();
      await page.getByRole("button", { name: "Mappa", exact: true }).click();
    } else {
      // su computer elenco e mappa stanno insieme, senza pulsante per passare dall'una all'altro
      await expect(map).toBeVisible();
      await expect(page.getByRole("button", { name: "Mappa", exact: true })).toHaveCount(0);
    }
    await expect(map).toBeVisible();
    // un segnaposto per ogni salone dell'elenco
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(salons);
  });

  test("il titolare si toglie dalla ricerca e ci torna", async ({ page }) => {
    await signIn(page, "andrea@barberia-saragozza.example", "taglendo-demo");
    try {
      await page.goto("/impostazioni/pagina");
      const sw = page.getByRole("switch", { name: /Compari nella ricerca di Taglendo/ });
      await expect(sw).toHaveAttribute("aria-checked", "true");
      await sw.click();
      await expect(sw).toHaveAttribute("aria-checked", "false");
      await expect.poll(listed).toBe(false); // salvato davvero
      await page.goto("/cerca?dove=Bologna");
      await expect(page.getByRole("heading", { level: 1, name: "Barbieri a Bologna" })).toBeVisible();
      await expect(page.locator('[data-salon="barberia-saragozza"]')).toHaveCount(0); // altre prove creano saloni con lo stesso nome
      await page.goto("/impostazioni/pagina");
      await page.getByRole("switch", { name: /Compari nella ricerca di Taglendo/ }).click();
      await expect.poll(listed).toBe(true);
    } finally {
      await showDemo(); // anche se la prova si ferma a metà, il salone demo torna nella ricerca
    }
  });
});

test.describe("Barbieri vicino a te: filtri, ordine, mappa (ridisegno del sito)", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await showDemo();
    await context.addCookies([{ name: "tg_cookie", value: "necessari", url: baseURL! }]);
  });

  const demo = (page: import("@playwright/test").Page) => page.locator('[data-salon="barberia-saragozza"]');

  test("i filtri stanno nell'indirizzo: ricaricando la pagina restano; il contatore e le etichette si tolgono", async ({ page }) => {
    await page.goto("/cerca?dove=Bologna");
    await expect(page.getByRole("button", { name: /^Filtri/ })).not.toContainText("1");
    // filtro rapido: Barba
    const barba = page.getByRole("list", { name: "Filtri rapidi" }).getByRole("button", { name: "Barba" });
    await barba.click();
    await expect(page).toHaveURL(/servizi=barba/);
    await expect(barba).toHaveAttribute("aria-pressed", "true");
    // pannello: distanza 10 km
    await page.getByRole("button", { name: /^Filtri/ }).click();
    const panel = page.getByRole("dialog", { name: "Tutti i filtri" });
    await panel.getByRole("button", { name: "10 km" }).click();
    await expect(page).toHaveURL(/km=10/);
    await expect(page.getByRole("button", { name: /^Filtri/ })).toContainText("2");
    await expect(panel.getByRole("button", { name: /^Mostra \d+ barberi/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    // «N barberie entro 10 km» e le etichette rimovibili
    await expect(page.getByText(/barberi[ae] entro 10 km/)).toBeVisible();
    await expect(demo(page)).toBeVisible();
    // ricaricando restano
    await page.reload();
    await expect(page.getByRole("list", { name: "Filtri rapidi" }).getByRole("button", { name: "Barba" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("list", { name: "Filtri attivi" })).toContainText("Entro 10 km");
    // togliere un'etichetta
    await page.getByRole("link", { name: "Togli il filtro: Entro 10 km" }).click();
    await expect(page).not.toHaveURL(/km=10/);
    await expect(page.getByRole("list", { name: "Filtri attivi" })).not.toContainText("Entro 10 km");
  });

  test("nessun risultato: riquadro tratteggiato e «Azzera i filtri»", async ({ page }) => {
    // a Venezia non c'è nessuna barberia: con qualsiasi filtro la risposta è «nessuna barberia con questi filtri»
    await page.goto("/cerca?dove=Venezia&km=2&nuovi=1&fascia=mattina&servizi=rasatura,bambini&aperto=1");
    await expect(page.getByText("Nessuna barberia con questi filtri")).toBeVisible();
    await expect(page.locator("[data-salon]")).toHaveCount(0);
    await page.getByRole("link", { name: "Azzera i filtri" }).click();
    await expect(page).toHaveURL(/\/cerca\?dove=Venezia$/);
    await expect(page.getByText("Nessuna barberia con questi filtri")).toHaveCount(0);
  });

  test("filtri veri: Liberi oggi / Aperto ora / Nuovi non mostrano chi non li ha", async ({ page }) => {
    await adminUpdate("salons", "slug=eq.barberia-saragozza", { created_at: new Date(Date.now() - 90 * 86400000).toISOString() });
    try {
      await page.goto("/cerca?dove=Bologna&nuovi=1");
      await expect(page.getByRole("heading", { level: 1, name: "Barbieri a Bologna" })).toBeVisible();
      await expect(demo(page)).toHaveCount(0); // arrivato da 90 giorni: non è «nuovo»
      await page.goto("/cerca?dove=Bologna");
      await expect(demo(page).getByText("Nuovo", { exact: true })).toHaveCount(0);
    } finally {
      await adminUpdate("salons", "slug=eq.barberia-saragozza", { created_at: new Date().toISOString() });
    }
    await page.goto("/cerca?dove=Bologna&nuovi=1");
    await expect(demo(page)).toBeVisible();
    await expect(demo(page).getByText("Nuovo", { exact: true })).toBeVisible();
  });

  test("Ordina: «Primo orario libero» si legge dall'indirizzo e si ricorda", async ({ page }) => {
    await page.goto("/cerca?dove=Bologna");
    await page.getByLabel("Ordina").selectOption("first");
    await expect(page).toHaveURL(/ordina=primo/);
    await page.reload();
    await expect(page.getByLabel("Ordina")).toHaveValue("first");
  });

  test("mappa: etichetta con il primo orario, scheda in basso, «Cerca in questa zona» dopo aver spostato la mappa", async ({ page, isMobile }) => {
    await page.goto("/cerca?dove=Bologna");
    if (isMobile) await page.getByRole("button", { name: "Mappa", exact: true }).click();
    // altre prove lasciano saloni nello stesso punto: si sceglie l'etichetta del salone demo (il clic va dritto al segnaposto)
    const pin = page.locator('.leaflet-marker-icon[title^="Barberia Saragozza,"]');
    await expect(pin).toBeVisible();
    await pin.dispatchEvent("click");
    const card = page.getByRole("group", { name: "Barberia Saragozza" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("link", { name: "Vedi la pagina" })).toHaveAttribute("href", "/barberia-saragozza");
    // su computer la scheda è alta quanto il suo contenuto, non fino in fondo alla mappa
    if (!isMobile) {
      const box = (await card.boundingBox())!;
      expect(box.height).toBeLessThan(330);
    }
    await card.getByRole("button", { name: "Chiudi la scheda" }).click();
    await expect(card).toBeHidden();
    // controlli
    await expect(page.getByRole("button", { name: "Ingrandisci la mappa" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Riduci la mappa" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Torna alla mia posizione" })).toBeVisible();
    // «Cerca in questa zona» compare solo dopo aver mosso la mappa
    await expect(page.getByRole("button", { name: "Cerca in questa zona" })).toHaveCount(0);
    await page.getByRole("button", { name: "Ingrandisci la mappa" }).click();
    await expect(page.getByRole("button", { name: "Cerca in questa zona" })).toBeVisible();
    await page.getByRole("button", { name: "Cerca in questa zona" }).click();
    await expect(page).toHaveURL(/\/cerca\?lat=[\d.]+&lng=[\d.]+&zona=1/);
    await expect(page.getByText(/barberi[ae] in questa zona/)).toBeVisible();
    // il titolo c'è; sul telefono, con la mappa a tutto schermo, la fascia in alto è nascosta
    if (!isMobile) await expect(page.getByRole("heading", { level: 1 })).toContainText("Barbieri a");
  });

  test("flusso: ricerca con filtri → scheda → pagina del salone → prenotazione", async ({ page }) => {
    await page.goto("/cerca?dove=Bologna&servizi=barba");
    await demo(page).getByRole("link", { name: "Barberia Saragozza", exact: true }).click();
    await expect(page).toHaveURL(/\/barberia-saragozza$/, { timeout: 30_000 });
    await page.locator("#servizi").getByRole("link", { name: "Prenota Barba" }).click();
    await expect(page.locator("#prenota-card").getByText("Passo 2 di 4 · Barbiere")).toBeVisible();
  });
});
