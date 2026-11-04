/**
 * Email ai clienti (C6) e avvisi per il barbiere (C11). Senza marca: da design/Schermate mancanti; NUOVO = proposta.
 */
export const emailPrefsCopy = {
  back: "Impostazioni",
  eyebrow: "Comunicazioni",
  title: "Email ai clienti",
  intro: "Partono da sole, con il nome e il telefono del tuo salone.",
  code: { label: "Codice di conferma", sub: "Sempre attiva: verifica l’email del cliente" },
  confirmation: { label: "Prenotazione confermata", sub: "Subito dopo la prenotazione" },
  reminder: { label: "Promemoria", sub: "Il giorno prima alle 18:00" },
  cancellation: { label: "Appuntamento annullato", sub: "Da te o dal cliente" },
  previews: "Vedi le anteprime",
  whatsapp: "I promemoria WhatsApp restano manuali: li invii tu dall’agenda.",
  moved: "Se sposti un appuntamento, il cliente riceve l’email di spostamento insieme a quelle di conferma.", // NUOVO
  always: "Sempre attiva", // NUOVO
  saved: "Email salvate", // NUOVO
  errors: { notOwner: "Le email le cambia il titolare.", generic: "Non siamo riusciti a salvare. Riprova." }, // NUOVO
  previewTitle: "Anteprime delle email", // NUOVO
  previewIntro: "Così le vede il cliente. I dati sono d’esempio.", // NUOVO
  previewNames: { code: "Codice di conferma", confirmed: "Prenotazione confermata", reminder: "Promemoria", cancelled: "Appuntamento annullato", moved: "Appuntamento spostato" },
} as const;

export const alertsCopy = {
  back: "Impostazioni",
  title: "Avvisi per te",
  newBooking: { label: "Nuova prenotazione online", sub: "Appena un cliente prenota dal link" },
  cancelled: { label: "Annullamento del cliente", sub: "Con l’orario che torna libero" },
  summary: { label: "Riepilogo della giornata", sub: "Ogni mattina alle 8:00" },
  how: "Come avvisarti",
  channels: { push: "Notifica", email: "Email", both: "Entrambi" },
  onlyMine: { label: "Solo i miei appuntamenti", sub: (others: string) => (others ? `Per il titolare: avvisi anche per ${others}` : "Per il titolare: avvisi anche per gli altri operatori") },
  barberNote: "Ricevi gli avvisi solo per i tuoi appuntamenti.", // NUOVO
  saved: "Avvisi salvati", // NUOVO
  errors: { generic: "Non siamo riusciti a salvare. Riprova." }, // NUOVO
  push: {
    // NUOVO: attivare le notifiche su questo dispositivo
    title: "Notifiche su questo dispositivo",
    off: "Non sono attive qui. Attivale per ricevere gli avvisi sul telefono.",
    on: "Attive su questo dispositivo.",
    enable: "Attiva le notifiche",
    disable: "Disattiva su questo dispositivo",
    blocked: "Le notifiche sono bloccate nelle impostazioni del browser. Riattivale da lì e riprova.",
    unsupported: "Questo browser non supporta le notifiche.",
    ios: "Su iPhone aggiungi prima Taglendo alla schermata Home (Condividi → Aggiungi alla schermata Home), poi attiva le notifiche da lì.",
    noKey: "Le notifiche non sono ancora configurate su questo sito.",
    enabledToast: "Notifiche attivate",
    disabledToast: "Notifiche disattivate",
    error: "Non siamo riusciti ad attivarle. Riprova.",
  },
} as const;
