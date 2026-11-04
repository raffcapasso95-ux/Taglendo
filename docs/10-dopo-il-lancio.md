# Cosa entra dopo il lancio

Voci già decise o emerse durante lo sviluppo. Nessuna è nella v1.

## Già nel piano
- **Fase 6 · Stripe:** abbonamento Solo/Salone, prova, carta rifiutata, disdetta, fatturazione. Oggi spenta (`BILLING_ENABLED=false`).
- **App nativa** (iOS e Android), dopo la beta.

## Da sistemare presto
- **Eliminazione account:** i clienti con appuntamenti futuri vengono annullati ma non ricevono l'email di annullamento.
- **Eliminazione account:** disdetta dell'abbonamento Stripe (insieme alla Fase 6).
- **Barbiere disattivato:** manca la schermata per disattivarlo (oggi il database lo gestisce, ma l'app no). Va deciso cosa vedono i clienti che avevano prenotato con lui.
- **Sentry:** caricamento delle source map, per leggere gli errori con le righe di codice vere.
- **Home commerciale:** punteggio Lighthouse da telefono 79 (la pagina del salone è a 98). Ottimizzare l'immagine del telefono in alto e il CSS che blocca il disegno.
- **DMARC** da `none` a `quarantine`.
- **Staging separato:** un secondo progetto Supabase per le prove, invece di provare sul database vero.
- **Prova su dispositivi veri:** Safari iOS, Android, screen reader.

## Idee
- Accesso con Apple e Google (i pulsanti ci sono, spenti).
- Promemoria via WhatsApp.
- Dominio `app.taglendo.it` separato dalle pagine dei saloni.
- Importazione dei clienti da un file.
