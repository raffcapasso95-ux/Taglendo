/**
 * Testi del sito commerciale, da design/Sito Taglendo.dc.html e Schermate mancanti (G1–G5).
 * NUOVO = non nel design (beta gratuita, pagine legali oltre il primo paragrafo).
 */
export const marketingCopy = {
  nav: { how: "Come funziona", before: "Prima e dopo", prices: "Prezzi", faq: "Domande", signIn: "Accedi", try: "Prova gratis", toApp: "Vai all’agenda" /* NUOVO */ },
  hero: {
    eyebrow: "App per barberie da 1 a 3 poltrone",
    title: "La tua agenda online, ",
    underlined: "sempre in tasca.",
    lead: "Taglendo è l’agenda online per barberie: i clienti prenotano dal tuo link a qualsiasi ora, tu vedi ogni appuntamento sul telefono e sul computer.",
    cta: "Prova gratis",
    priceBeta: "Gratis durante la beta", // NUOVO: al posto di "Da 9,90 € al mese + IVA"
    priceLive: "Da 9,90 € al mese + IVA",
    subBeta: "Zero commissioni · senza carta",
    subLive: "Zero commissioni · senza carta per provare",
    flowLabel: "Come funziona in breve",
    flow: ["Il cliente apre il tuo link", "Sceglie servizio e orario", "Lo trovi in agenda"],
    sticker: "Basta quaderno.",
    photoAlt: "Barbiere che rifinisce la barba di un cliente con le forbici",
    phoneAlt: "Agenda di Taglendo sul telefono con gli appuntamenti del giorno",
  },
  before: {
    eyebrow: "Prima e dopo",
    title: "Lo stesso venerdì, sul quaderno e su Taglendo.",
    lead: "Trascina la maniglia. A sinistra cancellature e numeri a metà, a destra ogni cliente al suo posto, con barbiere, servizio e orari liberi.",
    day: "Venerdì 30",
    notebook: "Quaderno",
    app: "Taglendo",
    handle: "Sposta il confronto tra quaderno e Taglendo",
    afterAlt: "La stessa giornata nell’agenda di Taglendo",
    paper: [
      ["9:00", "Luca — taglio + barba", "", false],
      ["9:30", "Marco B.", "richiamare!", true],
      ["10:00", "Davide (barba)", "", false],
      ["10:30", "??? forse Paolo", "", false],
      ["11:00", "Gianni → spostato", "lun?", true],
      ["12:00", "Simone 347 22…", "", false],
      ["15:30", "Ferri annulla", "", true],
      ["16:00", "bimbo Rossi", "", false],
    ] as ReadonlyArray<readonly [string, string, string, boolean]>,
  },
  how: {
    eyebrow: "Come funziona",
    title: "Tre passi, e i clienti prenotano da soli.",
    steps: [
      { n: "1", t: "Inserisci servizi e orari", d: "Prezzi, durate, pause e giorni di chiusura. Aggiungi le poltrone: fino a tre.", img: "/images/shot-listino-mobile.png", alt: "Listino e orari del salone nell’app Taglendo", bg: "muted" },
      { n: "2", t: "Condividi il tuo link", d: "Su Instagram, Google o WhatsApp. Il cliente vede solo gli orari davvero liberi e prenota senza registrarsi.", img: "/images/shot-prenota-mobile.png", alt: "Pagina di prenotazione vista dal cliente", bg: "peach" },
      { n: "3", t: "Gestisci la giornata", d: "Ogni prenotazione arriva in agenda. Chi entra senza appuntamento lo aggiungi in pochi tocchi.", img: "/images/shot-agenda-mobile.png", alt: "Agenda del barbiere sul telefono", bg: "muted" },
    ],
  },
  modes: {
    eyebrow: "Come prenotano i tuoi clienti",
    title: "Online o al telefono: decidi tu.",
    lead: "Lo scegli nelle impostazioni e lo cambi quando vuoi. La pagina del tuo salone si aggiorna subito.",
    online: { title: "Prenotazione online", text: "I clienti scelgono servizio, barbiere e orario dal tuo link, a qualsiasi ora. Decidi anche se possono annullare da soli o se devono chiamarti." },
    phone: { title: "Solo al telefono", text: "La pagina mostra listino, orari e il pulsante per chiamarti. Nessun appuntamento entra senza passare da te: lo inserisci tu in agenda." },
    note: "In entrambi i casi gli appuntamenti finiscono nella stessa agenda.",
    sample: { service: "Taglio uomo", price: "20 €", times: ["10:30", "11:15", "14:30"], book: "Prenota", callLabel: "Per prenotare", phone: "051 644 2190", call: "Chiama per prenotare" },
  },
  stops: {
    eyebrow: "Cosa cambia",
    title: "Tre cose che smetti di fare.",
    before: "Prima",
    with: "Con Taglendo",
    items: [
      { old: "Rispondere al telefono con le mani nella schiuma.", now: "I clienti prenotano dal tuo link, anche di notte.", img: "/images/foto/cambia-schiuma.jpg", alt: "Pennello da barba con schiuma sul viso di un cliente" },
      { old: "Ricordare a memoria chi arriva alle 15:30.", now: "È in agenda, con le note sul taglio di ogni cliente.", img: "/images/foto/cambia-taglio.jpg", alt: "Barbiere al lavoro su un taglio corto" },
      { old: "Accorgerti dei buchi quando ormai sono passati.", now: "Gli orari liberi sono in verde: li riempi con un tocco.", img: "/images/foto/cambia-macchinetta.jpg", alt: "Barbiere che usa la macchinetta su un cliente" },
    ],
  },
  prices: {
    eyebrow: "Prezzi",
    titleLive: "Paghi in base alle poltrone. Sulle prenotazioni, niente.",
    chairsQuestion: "Quante poltrone hai?",
    chairsGroup: "Quante poltrone prendono prenotazioni?",
    forYou: "Il piano per te",
    perMonth: "al mese + IVA",
    plans: [
      { name: "Solo", who: "Per chi lavora da solo", price: "9,90 €", ops: "1" },
      { name: "Salone", who: "Per la barberia con collaboratori", price: "19,90 €", ops: "fino a 3" },
    ],
    rows: { ops: "Operatori prenotabili", fee: "Commissioni sulle prenotazioni", none: "0 €" },
    tryPlan: (name: string) => `Prova ${name} gratis`,
    // NUOVO: la beta gratuita al posto dei piani
    beta: {
      title: "Gratis durante la beta.",
      lead: "Provi Taglendo senza pagare e senza carta di credito, con tutte le funzioni. Sulle prenotazioni non ci sono mai commissioni.",
      later: "Quando partiranno gli abbonamenti ti avvisiamo con largo anticipo, e avrai 15 giorni di prova con tutte le funzioni prima di decidere.",
      points: [
        { k: "Prezzo", v: "gratis" },
        { k: "Carta di credito", v: "non serve" },
        { k: "Commissioni sulle prenotazioni", v: "0 €" },
      ],
      cta: "Prova gratis",
    },
    includedEyebrow: "In entrambi i piani",
    includedEyebrowBeta: "Tutto incluso", // NUOVO
    includedTitle: "Il resto è già dentro.",
    includedNote: "Abbonamento mensile, disdici quando vuoi. I dati dei tuoi clienti restano tuoi.",
    includedNoteBeta: "Nessun impegno: i dati dei tuoi clienti restano tuoi e li puoi esportare quando vuoi.", // NUOVO
    included: [
      { t: "Agenda per poltrona", d: "Ogni barbiere col suo colore" },
      { t: "Pagina del salone", d: "Prenotazione online o solo al telefono: decidi tu" },
      { t: "Conferma via email", d: "Il cliente conferma con un codice" },
      { t: "Rubrica clienti", d: "Storico visite e note sul taglio" },
      { t: "Messaggi WhatsApp pronti", d: "Li controlli e li invii tu" },
      { t: "Telefono e computer", d: "La stessa agenda, sempre aggiornata" },
    ],
  },
  faq: {
    title: "Domande frequenti",
    items: (beta: boolean) => [
      { q: "I miei clienti devono scaricare un’app?", a: "No. Aprono il tuo link dal telefono, scelgono servizio e orario e confermano con un codice via email." },
      beta
        ? { q: "Ci sono commissioni sulle prenotazioni?", a: "No. Durante la beta Taglendo è gratis e sulle prenotazioni non ci sono mai commissioni. Quando partiranno gli abbonamenti ti avvisiamo per tempo." } // NUOVO
        : { q: "Ci sono commissioni sulle prenotazioni?", a: "No. Paghi solo l’abbonamento mensile: 9,90 € per una poltrona, 19,90 € fino a tre, più IVA." },
      { q: "Funziona anche dal computer?", a: "Sì. È la stessa agenda su telefono e computer, sempre aggiornata." },
      { q: "Posso far prenotare i clienti solo al telefono?", a: "Sì. Nelle impostazioni scegli tu: prenotazione online attiva o solo telefono, e lo stesso per gli annullamenti. Con «solo telefono» la tua pagina mostra listino, orari e il pulsante per chiamarti." },
      { q: "E chi entra senza prenotare?", a: "Lo aggiungi in pochi tocchi nel primo spazio libero. L’orario sparisce subito anche dal link di prenotazione." },
    ],
  },
  start: {
    title: "Il primo venerdì senza quaderno.",
    lead: "Lasci l’email, crei il salone in dieci minuti e condividi il link con i clienti.",
    label: "La tua email",
    placeholder: "nome@barberia.it",
    button: "Prova gratis",
    noteBeta: "Gratis durante la beta, niente carta di credito.", // NUOVO
    noteLive: "15 giorni gratis, niente carta di credito.",
  },
  footer: {
    tagline: "Agenda e prenotazioni online per barberie da 1 a 3 poltrone.",
    product: "Prodotto",
    faq: "Domande frequenti",
    legal: "Legale",
    privacy: "Informativa privacy",
    terms: "Termini di servizio",
    cookies: "Cookie",
    cookiePrefs: "Preferenze cookie",
    contacts: "Contatti",
    photos: "Foto dimostrative",
  },
  bar: { sub: "App per barbieri", mainBeta: "Gratis durante la beta", mainLive: "Da 9,90 € al mese", cta: "Prova gratis" },
  cookie: "Usiamo cookie tecnici per far funzionare il sito. Quelli per le statistiche li usiamo solo se accetti.",
  meta: {
    title: "Taglendo — Prenotazioni online e agenda per barbieri",
    description: "Taglendo è l’agenda online per barberie da 1 a 3 poltrone: i clienti prenotano dal tuo link a qualsiasi ora, tu vedi ogni appuntamento sul telefono e sul computer.",
  },
} as const;
