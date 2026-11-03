/**
 * Testi del primo avvio (A6–A10).
 * Quelli marcati NUOVO non esistono nei design (messaggi d'errore, etichette
 * di campi aggiunti): sono una proposta, da rivedere.
 */

export const onboardingCopy = {
  nav: { title: "Primo avvio", steps: ["Il salone", "Orari", "Servizi", "Poltrone"], note: "Puoi cambiare tutto dopo, nelle impostazioni." },
  step: (n: number) => `Passo ${n} di 4`,
  back: "Indietro",
  next: "Continua",
  finish: "Finisci",
  preview: {
    title: "Come lo vedono i clienti",
    salon: "Il nome e il telefono compaiono così in cima alla pagina di prenotazione.",
    hours: "Orari",
    services: "Servizi",
    who: "Con chi",
    anyone: "Chiunque",
  },
  salon: {
    title: "Il tuo salone",
    name: "Nome del salone",
    address: "Indirizzo",
    phone: "Telefono",
    phoneHint: "Lo vedono i clienti per chiamarti.",
    link: "Il tuo link",
    edit: "Modifica",
  },
  hours: {
    title: "Quando sei aperto",
    days: "Giorni",
    schedule: "Orario",
    opens: "Apre",
    closes: "Chiude",
    breakTitle: "Pausa pranzo",
    breakText: "Gli orari della pausa non si prenotano.",
    from: "Dalle",
    to: "Alle",
    dayLetters: ["D", "L", "M", "M", "G", "V", "S"], // indice = giorno (0 = domenica)
    dayNames: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"],
  },
  services: {
    title: "Cosa offri",
    lead: "Abbiamo preparato i servizi più comuni. Togli quelli che non fai e correggi prezzi e durate.",
    desktopLead: "Togli i servizi che non fai e correggi prezzi e durate.",
    add: "+ Aggiungi un servizio",
    name: "Nome del servizio",
    duration: "Durata",
    price: "Prezzo",
    save: "Salva servizio",
  },
  chairs: {
    title: "Chi lavora in salone",
    count: "Poltrone prenotabili",
    owner: "Titolare",
    you: "Tu",
    chair: (n: number) => `Poltrona ${n}`,
    placeholder: "Nome del barbiere",
    plan: "Gli inviti ai barbieri li mandi dopo.",
  },
  done: {
    eyebrow: "Tutto pronto",
    title: "Il tuo link è attivo",
    copy: "Copia link",
    copied: "✓ Link copiato",
    share: "Condividi su WhatsApp o Instagram",
    /** Beta gratuita: nessun pagamento (BILLING_ENABLED spento). */
    beta: "Beta gratuita: non ti chiediamo nessun pagamento.",
    trial: (date: string) => `Prova gratuita attiva fino al ${date}.`,
    agenda: "Vai all’agenda",
  },

  // — NUOVO: non presenti nei design —
  errors: {
    name: "Scrivi il nome del salone.",
    address: "Scrivi l’indirizzo.",
    phone: "Scrivi il telefono: solo cifre, + e spazi.",
    slugInvalid: "Il link può avere solo lettere minuscole, numeri e trattini.",
    slugTaken: "Questo link è già usato da un altro salone.",
    noDays: "Scegli almeno un giorno.",
    time: "Scrivi l’ora così: 9:00.",
    openAfterClose: "L’apertura deve essere prima della chiusura.",
    breakInvalid: "La pausa deve iniziare prima di finire.",
    breakOutside: "La pausa deve stare dentro l’orario di apertura.",
    noServices: "Tieni almeno un servizio.",
    serviceName: "Scrivi il nome del servizio.",
    serviceDuration: "La durata va da 5 a 240 minuti.",
    servicePrice: "Scrivi il prezzo in euro.",
    barberName: "Scrivi il nome del barbiere.",
    generic: "Qualcosa non ha funzionato. Riprova.",
  },
} as const;
