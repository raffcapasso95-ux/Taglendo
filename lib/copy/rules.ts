/**
 * Regole di prenotazione (C1) e interruttori della scheda "Prenotazioni dei clienti".
 * I testi senza marca vengono da design/Schermate mancanti (C1) e da Taglendo App.dc.html; NUOVO = proposta.
 */
export const rulesCopy = {
  eyebrow: "Impostazioni",
  back: "Salone",
  title: "Prenotazioni dei clienti",
  section: "Regole",
  book: {
    label: "Prenotazione online",
    on: "Attiva",
    off: "Solo telefono",
    hintOn: "I clienti prenotano da soli dal tuo link, a qualsiasi ora.",
    hintOff: "Il link mostra listino e orari, ma per prenotare il cliente ti chiama. Gli appuntamenti li inserisci tu.",
  },
  cancel: {
    label: "Annullamento online",
    on: "Attivo", // NUOVO
    off: "Solo telefono",
    hintOn: "Il cliente annulla dal link nell’email: l’orario torna libero da solo.",
    hintOff: "Per spostare o annullare, il cliente deve chiamarti.",
  },
  prices: {
    label: "Prezzi",
    on: "Visibili",
    off: "Nascosti",
    hintOn: "Il cliente vede il prezzo di ogni servizio.",
    hintOff: "La pagina mostra servizi e durate, senza prezzi. Utile se i prezzi cambiano o li concordi in salone.",
  },
  notice: { label: "Preavviso minimo", hint: "Quanto prima deve prenotare il cliente.", options: { 30: "30 min", 120: "2 ore", 1440: "Il giorno prima" } },
  advance: { label: "Prenotabile fino a", hint: "Quanto avanti nel calendario.", options: { 14: "2 settimane", 30: "1 mese", 60: "2 mesi" } },
  step: { label: "Orari proposti ogni", hint: "Il cliente vede 9:00, 9:15, 9:30…", options: { 15: "15 min", 30: "30 min" } },
  limit: { label: "Annullamento online fino a", hint: "Dopo, il cliente deve chiamarti.", options: { 120: "2 ore prima", 1440: "24 ore prima" } },
  save: "Salva",
  cancelChanges: "Annulla", // NUOVO
  saved: "Regole salvate", // NUOVO
  savedSub: "Valgono subito per il link del salone.", // NUOVO
  errors: { notOwner: "Le regole le cambia il titolare.", generic: "Non siamo riusciti a salvare. Riprova." }, // NUOVO
} as const;
