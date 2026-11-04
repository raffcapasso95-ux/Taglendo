/**
 * Testi della pagina pubblica del salone. Quelli di design/Sito Barberia Saragozza.dc.html
 * (e di E5, E6, E8, E9) sono copiati; quelli marcati NUOVO non ci sono nei design.
 */
export const publicCopy = {
  nav: { prices: "Prezzi", team: "Barbieri", where: "Dove siamo" },
  callToBook: "Chiama per prenotare", // docs/04-regole.md
  callNow: "Chiama ora",
  bookOnline: "Prenota online",
  bookShort: "Prenota", // NUOVO: bottone corto nella barra
  aside: {
    // NUOVO: riquadro accanto alla prenotazione
    cancelTitle: "Annulli gratis",
    cancelBody: (limit: string) => `fino a ${limit} prima, dal link nell’email di conferma. Per spostare l’orario chiama il salone.`,
    phoneTitle: "Annullamento al telefono",
    phoneBody: "Per annullare o spostare l’appuntamento chiama il salone.",
  },
  seeServices: "Vedi servizi e prezzi",
  seeServicesNoPrices: "Vedi i servizi", // NUOVO: prezzi nascosti
  menu: {
    title: "Si prenota al telefono.",
    intro: "Chiamaci negli orari di apertura: ti troviamo il primo posto libero, con il barbiere che preferisci. Paghi in negozio.",
    label: "Listino",
    pricesHidden: "Prezzi in salone: chiedi pure al telefono.",
    toBook: "Per prenotare",
    answering: "Rispondiamo tra un cliente e l’altro: se non rispondiamo, richiama tra poco.",
    change: "Per spostare o annullare un appuntamento chiama lo stesso numero.",
    empty: "Il listino è in preparazione.", // NUOVO
  },
  team: { title: "Chi ti taglia." },
  where: { label: "Dove siamo", openMaps: "Apri in Mappe" },
  footer: { privacy: "Informativa privacy", cookies: "Preferenze cookie", poweredBy: "Prenotazioni con" },
  instagram: "Altri lavori su Instagram",
  cookie: {
    title: "Cookie",
    chooseTitle: "Scegli i cookie",
    text: "Usiamo cookie tecnici per farti prenotare. Quelli per le statistiche li usiamo solo se accetti.",
    necessary: "Necessari",
    necessaryText: "Servono per prenotare e ricordare le tue scelte.",
    always: "Sempre attivi",
    stats: "Statistiche",
    statsText: "Ci dicono quali pagine si usano, in forma anonima.",
    reject: "Rifiuta",
    accept: "Accetta",
    choose: "Scegli quali",
    save: "Salva le scelte",
    acceptAll: "Accetta tutti",
  },
  /** "Tre poltrone, tre mani diverse." NUOVO per 2 e per 3 poltrone; con una sola non si mostra. */
  teamNote: (n: number) => (n === 2 ? "Due poltrone, due mani diverse." : n >= 3 ? "Tre poltrone, tre mani diverse." : null),
  barPhone: "Prenota al telefono", // NUOVO
  heroLeadFallback: "Prenota al telefono con un barbiere di fiducia.", // NUOVO: salone senza descrizione
} as const;
