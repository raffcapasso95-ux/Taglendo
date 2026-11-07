/**
 * Testi della prenotazione online. Quelli con la marca di design vengono da
 * design/Sito Barberia Saragozza.dc.html e da Schermate mancanti (E1–E7); NUOVO = proposta, non nei design.
 */
export const bookingCopy = {
  emailError: "Controlla l’email: manca qualcosa (es. nome@esempio.it).",
  privacyError: "Conferma di aver letto l’informativa per prenotare.",
  codeTitle: "Controlla la tua email",
  codeSentBefore: "Codice di 6 cifre inviato a ",
  codeSentAfter: ". Inseriscilo: la prenotazione si conferma da sola.",
  wrongEmail: "Email sbagliata?",
  seeYou: (when: string) => `Ci vediamo ${when}!`,
  summarySent: (email: string) => `Riepilogo inviato a ${email}.`,
  addCalendar: "Aggiungi al calendario",
  again: "Nuova prenotazione",
  // NUOVO — errori e stati non disegnati
  codeLabel: "Codice di conferma",
  resend: "Invia un nuovo codice",
  resendIn: (s: number) => `Nuovo codice tra ${s} s`,
  errors: {
    generic: "Qualcosa non ha funzionato. Riprova tra poco.",
    network: "Errore di rete. Controlla la connessione e riprova.",
    name: "Scrivi nome e cognome.",
    phone: "Il telefono può avere solo numeri, spazi e +.",
    wait: (s: number) => `Hai chiesto un codice da poco. Riprova tra ${s} secondi.`,
    limit: "Hai chiesto troppi codici. Riprova tra un’ora, oppure chiama il salone.",
    send: "Non siamo riusciti a mandare l’email. Controlla l’indirizzo e riprova.",
    wrong: (left: number) => (left === 1 ? "Codice errato. Ti resta un tentativo." : `Codice errato. Ti restano ${left} tentativi.`),
    locked: "Troppi tentativi. Chiedi un nuovo codice.",
    expired: "Il codice è scaduto. Chiedine uno nuovo.",
    none: "Non troviamo il codice. Chiedine uno nuovo.",
    paused: "Le prenotazioni online sono in pausa. Per prenotare chiama il salone.",
    gone: "Questo servizio non è più disponibile. Scegline un altro.",
    taken: "Questo orario è stato appena preso.",
    takenText: (alt: boolean) => (alt ? "Scegli un altro orario qui sotto: il codice resta valido." : "Non ci sono altri orari vicini: scegli un altro giorno."),
  },
} as const;
