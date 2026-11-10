/** NUOVO: la guida al primo accesso in agenda. Non c'è nei design: testi proposti. */
export type TourStep = { target: string | null; title: string; body: string; phoneOnly?: boolean; desktopOnly?: boolean };

export const tourCopy = {
  label: "Guida all’agenda",
  start: "Inizia la guida",
  skip: "Salta la guida",
  next: "Avanti",
  back: "Indietro",
  done: "Inizia a lavorare",
  progress: (n: number, total: number) => `${n} di ${total}`,
  welcome: (first: string) => ({ title: first ? `Benvenuto in Taglendo, ${first}!` : "Benvenuto in Taglendo!", body: "In un minuto ti mostriamo cosa puoi fare dall’agenda." }),
  steps: [
    { target: "new", title: "Fissa un appuntamento", body: "Scegli servizio, barbiere, giorno e ora, poi il cliente. Se ha un’email, gli arriva la conferma." },
    { target: "walkin", title: "Cliente in negozio", body: "Per chi entra senza prenotazione: parte subito, se c’è una poltrona libera." },
    { target: "week", title: "Cambia giorno", body: "Tocca un giorno della settimana, usa le frecce o apri il calendario. Il puntino dice che ci sono appuntamenti." },
    { target: "barbers", title: "Un barbiere alla volta", body: "Guarda l’agenda di tutti o di un solo barbiere." },
    { target: "day", title: "La tua giornata", body: "Tocca un appuntamento per spostarlo, segnarlo completato o annullarlo. Tocca uno spazio libero per fissare proprio lì." },
    { target: "clients", title: "Clienti", body: "La rubrica: storico delle visite, preferenze e note, e WhatsApp a portata di tocco.", desktopOnly: true },
    { target: "salon", title: "Salone", body: "Il tuo link di prenotazione da mettere su Instagram, WhatsApp e Google, e tutte le impostazioni del salone.", desktopOnly: true },
    { target: "menu", title: "Menu", body: "Da qui trovi Clienti, Salone (con il tuo link di prenotazione), Listino e Impostazioni.", phoneOnly: true },
  ] as TourStep[],
  end: { title: "Tutto pronto!", body: "Puoi rivedere questa guida quando vuoi da Impostazioni › Aiuto." },
  again: "Rivedi la guida all’agenda",
  againSub: "Un minuto per scoprire cosa puoi fare",
} as const;
