/** Testi della pagina "La tua prenotazione": E1–E5 di design/Schermate mancanti.dc.html. NUOVO = proposta. */
export const manageCopy = {
  title: "La tua prenotazione",
  code: (c: string) => `Prenotazione ${c}`,
  payInShop: "Paghi in negozio",
  calendar: "Aggiungi al calendario",
  cancel: "Annulla la prenotazione",
  cancelNote: (limit: string) => `Annulli gratis fino a ${limit}. Per spostare l’orario chiama il salone.`,
  phoneNote: "Per annullare o spostare l’orario chiama il salone.", // NUOVO: annullamento online spento
  call: "Chiama",
  where: "Dove",
  map: "Mappa",
  confirmTitle: "Annullare l’appuntamento?",
  confirmText: (when: string, who: string) => `${when}${who}. L’orario torna libero per altri clienti.`,
  yes: "Sì, annulla",
  no: "No, lo tengo",
  doneTitle: "Appuntamento annullato",
  doneText: (when: string) => `${when} non sei più in agenda. Ti abbiamo mandato una conferma via email.`,
  doneTextNoMail: (when: string) => `${when} non sei più in agenda.`, // NUOVO: il salone ha spento l'email di annullamento
  again: "Prenota un altro orario",
  lateTitle: "Non puoi più annullare online",
  lateText: (limit: string) => `Mancano meno di ${limit} all’appuntamento. Se non riesci a venire, avvisa il salone con una telefonata.`,
  callNumber: (phone: string) => `Chiama ${phone}`,
  invalidTitle: "Questo link non funziona più",
  invalidText: "Può essere scaduto, oppure l’appuntamento è già passato o è stato annullato. Controlla l’ultima email del salone.",
  toSalon: "Vai alla pagina del salone",
  poweredBy: "Prenotazioni con",
  errors: {
    generic: "Non siamo riusciti ad annullare. Riprova tra poco, oppure chiama il salone.", // NUOVO
    network: "Errore di rete. Controlla la connessione e riprova.", // NUOVO
  },
} as const;
