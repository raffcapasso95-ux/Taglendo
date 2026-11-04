/** Offline (D1). Quelli con la marca di design vengono da Schermate mancanti; NUOVO = proposta. */
export const offlineCopy = {
  title: "Sei offline",
  text: (savedAt: string | null) => (savedAt ? `Vedi l’agenda salvata alle ${savedAt}. Le modifiche partono appena torni online.` : "Le modifiche partono appena torni online."),
  waiting: "In attesa di invio",
  // NUOVO
  pending: (n: number) => (n === 1 ? "1 modifica in attesa di invio" : `${n} modifiche in attesa di invio`),
  sending: "Invio delle modifiche…",
  sent: (n: number) => (n === 1 ? "Modifica inviata" : "Modifiche inviate"),
  failed: (client: string, service: string, error: string) => `${client} · ${service}: ${error}`,
  retry: "Riprova",
  discard: "Elimina",
  queued: "Salvato sul telefono",
  queuedSub: "Parte appena torni online",
  moveNeedsNet: "Per spostare o annullare serve la connessione.",
  walkInNeedsNet: "«Cliente in negozio» serve la connessione: usa «Nuovo appuntamento».",
  onlyDay: (label: string) => `Offline puoi scegliere solo gli orari di ${label}.`,
  pendingTitle: "In attesa di invio",
  statusLine: (status: string) => `Stato: ${status}`,
  genericFail: "non siamo riusciti a inviarlo",
} as const;
