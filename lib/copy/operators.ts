/**
 * Testi di Operatori e permessi (C4) e dell'invito (C7).
 * Quelli marcati NUOVO non esistono nei design: sono una proposta, da rivedere.
 */

export const operatorsCopy = {
  back: "Impostazioni",
  title: "Operatori",
  people: "Persone",
  owner: "Titolare",
  you: "Tu",
  chair: (n: number) => `Poltrona ${n}`,
  accepted: "invito accettato",
  pending: "invito in attesa",
  resend: "Invia di nuovo",
  invite: "+ Invita un operatore",
  permissions: "Cosa possono fare i barbieri",
  perms: {
    seeAll: "Vedere l’agenda di tutti",
    edit: "Fissare e spostare appuntamenti",
    contacts: "Vedere telefono ed email dei clienti",
    settings: "Cambiare listino, orari e regole",
    ownerOnly: "Solo titolare",
  },

  // — NUOVO: non presenti nei design —
  notInvited: "non ancora invitato",
  expired: "invito scaduto",
  inviteAction: "Invita",
  revoke: "Annulla invito",
  dialog: {
    inviteTitle: "Invita un operatore",
    inviteTitleFor: (name: string) => `Invita ${name}`,
    name: "Nome del barbiere",
    email: "Email del barbiere",
    emailHint: "Gli arriva l’invito per creare la sua password.",
    submit: "Crea invito",
    close: "Chiudi",
    readyTitle: "Invito pronto",
    readyText: (name: string) => `Manda questo link a ${name}. Vale 7 giorni.`,
    copy: "Copia link",
    copied: "✓ Link copiato",
  },
  full: "Hai già tre poltrone: è il massimo.",
  errors: {
    name: "Scrivi il nome del barbiere.",
    email: "Controlla l’indirizzo email.",
    full: "Non ci sono poltrone libere.",
    notOwner: "Solo il titolare può invitare.",
    generic: "Qualcosa non ha funzionato. Riprova.",
  },
} as const;
