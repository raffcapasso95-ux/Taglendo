/**
 * Testi del sito commerciale, da design/Sito Taglendo.dc.html e Schermate mancanti (G1–G5).
 * NUOVO = non nel design (beta gratuita, pagine legali oltre il primo paragrafo).
 */
export const marketingCopy = {
  nav: { how: "Come funziona", before: "Prima e dopo", prices: "Prezzi", faq: "Domande", signIn: "Accedi", try: "Prova gratis", toApp: "Vai all’agenda" /* NUOVO */ },
  before: {
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
  stops: {
    items: [
      { old: "Rispondere al telefono con le mani nella schiuma.", now: "I clienti prenotano dal tuo link, anche di notte.", img: "/images/foto/cambia-schiuma.jpg", alt: "Pennello da barba con schiuma sul viso di un cliente" },
      { old: "Ricordare a memoria chi arriva alle 15:30.", now: "È in agenda, con le note sul taglio di ogni cliente.", img: "/images/foto/cambia-taglio.jpg", alt: "Barbiere al lavoro su un taglio corto" },
      { old: "Accorgerti dei buchi quando ormai sono passati.", now: "Gli orari liberi sono in verde: li riempi con un tocco.", img: "/images/foto/cambia-macchinetta.jpg", alt: "Barbiere che usa la macchinetta su un cliente" },
    ],
  },
  prices: {
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
  footer: {
    tagline: "Agenda e prenotazioni online per barberie da 1 a 3 poltrone.",
    product: "Prodotto",
    faq: "Domande frequenti",
    legal: "Legale",
    privacy: "Informativa privacy",
    terms: "Termini di servizio",
    cookies: "Cookie",
    contacts: "Contatti",
    photos: "Foto dimostrative",
  },
  cookie: "Usiamo cookie tecnici per far funzionare il sito. Quelli per le statistiche li usiamo solo se accetti.",
  meta: {
    title: "Taglendo — Prenotazioni online e agenda per barbieri",
    description: "Taglendo è l’agenda online per barberie da 1 a 3 poltrone: i clienti prenotano dal tuo link a qualsiasi ora, tu vedi ogni appuntamento sul telefono e sul computer.",
  },
} as const;
