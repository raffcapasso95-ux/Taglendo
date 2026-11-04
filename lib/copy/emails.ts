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
