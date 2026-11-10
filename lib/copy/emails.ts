/** Testi delle email F1 e F2, copiati da design/Schermate mancanti.dc.html (sezione F). NUOVO = non presente nel design. */
export const emailCopy = {
  code: {
    subject: (code: string) => `Il tuo codice: ${code}`,
    title: "Conferma la prenotazione",
    body: "Scrivilo nella pagina di prenotazione. Scade tra 10 minuti.",
    ignore: "Se non hai chiesto tu questo codice, ignora questa email.",
  },
  confirmed: {
    subject: (when: string) => `Confermato: ${when}`,
    title: (weekday: string, first: string) => `Ci vediamo ${weekday}, ${first}!`,
    when: "Quando",
    service: "Servizio",
    barber: "Barbiere",
    price: "Prezzo",
    where: "Dove",
    inShop: "in negozio",
    manage: "Gestisci la prenotazione",
    cancelFree: (limit: string, phone: string) => `Annulli gratis fino a ${limit}. Per spostare l’orario chiama lo ${phone}.`,
    phoneOnly: (phone: string) => `Per spostare o annullare l’appuntamento chiama lo ${phone}.`, // NUOVO: annullamento online spento
    calendar: "Aggiungi al calendario",
  },
} as const;

/** F4 · Appuntamento annullato (qui: annullato dal cliente; l'annullamento dal salone arriva con la Fase 5). */
export const cancelEmailCopy = {
  subject: "Appuntamento annullato",
  title: "Appuntamento annullato",
  body: (when: string) => `Hai annullato l’appuntamento di ${when}. Non sei più in agenda.`,
  bySalon: (when: string) => `Il salone ha annullato l’appuntamento di ${when}. Non sei più in agenda.`, // NUOVO: prima riga dell'annullamento dal salone
  again: "Prenota un altro orario",
  notYou: (phone: string) => `Non sei stato tu? Chiama il salone allo ${phone}.`,
} as const;

/** F3 · Promemoria, il giorno prima alle 18:00. */
export const reminderEmailCopy = {
  // NUOVO: il promemoria parte con l'anticipo scelto dal salone, quindi può essere per oggi, domani o un altro giorno
  subject: (salon: string, at: string, day: "oggi" | "domani" | "altro" = "domani", dayLong = "") =>
    day === "oggi" ? `Oggi alle ${at} da ${salon}` : day === "domani" ? `Domani alle ${at} da ${salon}` : `${dayLong.charAt(0).toUpperCase()}${dayLong.slice(1)} alle ${at} da ${salon}`,
  title: (first: string, day: "oggi" | "domani" | "altro" = "domani", weekday = "") =>
    day === "oggi" ? `A più tardi, ${first}` : day === "domani" ? `A domani, ${first}` : `Ci vediamo ${weekday}, ${first}`,
  when: "Quando",
  service: "Servizio",
  manage: "Gestisci la prenotazione",
  cancelFree: (limit: string) => `Non riesci a venire? Annulla dal link entro ${limit}, così l’orario torna libero.`,
  phoneOnly: (phone: string) => `Non riesci a venire? Avvisa il salone allo ${phone}.`, // NUOVO: annullamento online spento
} as const;

/** F6 · Appuntamento spostato dal salone. */
export const movedEmailCopy = {
  subject: (when: string) => `Nuovo orario: ${when}`,
  title: "Il tuo appuntamento è stato spostato",
  before: "Prima",
  after: "Adesso",
  service: "Servizio",
  manage: "Gestisci la prenotazione",
  notOk: (phone: string) => `Il nuovo orario non ti va bene? Chiama il salone allo ${phone}.`,
} as const;

/** F5 · Invito a un operatore. */
export const inviteEmailCopy = {
  subject: (owner: string) => `${owner} ti ha invitato su Taglendo`,
  title: (name: string) => `Ciao ${name}, entra nell’agenda del salone`,
  body: (ownerFull: string, chair: number) => `${ownerFull} ti ha aggiunto come barbiere sulla poltrona ${chair}. Crea il tuo accesso per vedere i tuoi appuntamenti dal telefono.`,
  accept: "Accetta l’invito",
  note: "Il link vale 7 giorni. Non aspettavi questo invito? Ignora l’email.",
} as const;

/** Avvisi al barbiere (D5, C11). Le email per lo staff non sono nei design: NUOVO. */
export const staffCopy = {
  newBooking: { push: "Nuova prenotazione", subject: (who: string, when: string) => `Nuova prenotazione: ${who} · ${when}` },
  cancelled: { push: "Annullato dal cliente", subject: (who: string, when: string) => `Annullato dal cliente: ${who} · ${when}`, free: "l’orario è di nuovo libero" },
  summary: { push: "La giornata di oggi", subject: (n: number) => (n === 0 ? "Oggi nessun appuntamento" : n === 1 ? "Oggi hai 1 appuntamento" : `Oggi hai ${n} appuntamenti`), none: "Nessun appuntamento in agenda: giornata libera." },
  open: "Apri l’agenda",
} as const;
