/**
 * Testi di accesso e primo avvio.
 *
 * I testi di schermata vengono da design/Schermate mancanti.dc.html.
 * Quelli marcati NUOVO non esistono nei design (messaggi d'errore e simili):
 * sono una proposta, da rivedere.
 */

export const authCopy = {
  // — dai design —
  signIn: {
    title: "Accedi",
    lead: "Accedi per vedere l’agenda di oggi.",
    desktopHeadline: "La giornata del tuo salone, a colpo d’occhio.",
    remember: "Ricordami",
    forgot: "Password dimenticata?",
    submit: "Accedi",
    or: "oppure",
    noAccount: "Non hai un account?",
    trial: "Prova gratis",
  },
  signUp: {
    title: "Registra il tuo salone",
    lead: "Crea il tuo salone in dieci minuti.",
    desktopHeadline: "Il primo venerdì senza quaderno.",
    chips: ["Gratis in beta", "Senza carta", "Disdici quando vuoi"],
    back: "Indietro",
    submit: "Crea account",
    haveAccount: "Hai già un account?",
    signIn: "Accedi",
    termsBefore: "Accetto i",
    terms: "Termini di servizio",
    termsMiddle: "e ho letto l’",
    privacy: "Informativa privacy",
  },
  verify: {
    title: "Controlla la tua email.",
    desktopTitle: "Controlla la tua email",
    desktopHeadline: "Manca solo un passo.",
    sentTo: "Codice inviato a",
    codeLabel: "Codice di 6 cifre",
    submit: "Conferma",
    notArrived: "Non è arrivata? Guarda nello spam o",
    resendIn: "invia di nuovo tra",
    resend: "invia di nuovo",
    wrongEmail: "Email sbagliata?",
    change: "Cambiala",
    back: "Indietro",
  },
  forgot: {
    title: "Nessun problema.",
    desktopTitle: "Password dimenticata",
    desktopHeadline: "Succede a tutti.",
    lead: "Ti mandiamo un link per sceglierne una nuova.",
    back: "Accedi",
    submit: "Invia il link",
    sentTitle: "Email inviata",
    sentText: "Apri il link entro 30 minuti. Se non arriva, guarda nello spam.",
    openMail: "Apri l’app Mail",
    backToSignIn: "Torna ad accedere",
  },
  newPassword: {
    title: "Scegli una nuova password.",
    desktopTitle: "Scegli una nuova password",
    desktopHeadline: "Una password nuova e si riparte.",
    lead: "Poi entri direttamente in agenda.",
    newLabel: "Nuova password",
    repeatLabel: "Ripeti la password",
    mismatch: "Le due password non coincidono.",
    submit: "Salva e accedi",
  },
  fields: {
    email: "Email",
    password: "Password",
    fullName: "Nome e cognome",
    show: "Mostra",
    hide: "Nascondi", // NUOVO: il design mostra solo "Mostra"
  },
  invite: {
    title: (owner: string) => `${owner} ti ha invitato`,
    lead: "Lavora con l’agenda di",
    desktopHeadline: (owner: string, salon: string) => `${owner} ti ha invitato in ${salon}.`,
    desktopTitle: "Crea il tuo accesso",
    desktopLead: (owner: string) => `Lavorerai con l’agenda del salone, secondo i permessi scelti da ${owner}.`,
    name: "Il tuo nome",
    email: "Email",
    emailNote: "È l’indirizzo a cui è arrivato l’invito.",
    password: "Password",
    submit: "Entra nel salone",
    note: (owner: string) => `Vedrai l’agenda e i clienti secondo i permessi scelti da ${owner}.`,
  },
  // dall'app: messaggi già usati nella prenotazione
  invalidEmail: "Controlla l’indirizzo email.",
  wrongCode: "Codice non corretto. Controlla l’email e riprova.",

  // — NUOVO: non presenti nei design —
  errors: {
    credentials: "Email o password non corretti.",
    alreadyRegistered: "Questa email è già registrata. Accedi oppure scegli una nuova password.",
    passwordShort: "Servono almeno 8 caratteri.",
    nameShort: "Scrivi nome e cognome.",
    termsRequired: "Conferma di aver letto i termini e l’informativa per continuare.",
    codeExpired: "Il codice è scaduto. Chiedine uno nuovo.",
    linkExpired: "Il link non è più valido. Chiedine uno nuovo.",
    tooMany: "Troppi tentativi. Riprova tra un minuto.",
    generic: "Qualcosa non ha funzionato. Riprova.",
    inviteInvalid: "Questo invito non è più valido. Chiedi al titolare di mandartene uno nuovo.",
    inviteEmailTaken: "Esiste già un account con questa email. Accedi per entrare nel salone.",
  },
} as const;
