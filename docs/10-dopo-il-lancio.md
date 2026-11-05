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
- **Home commerciale:** punteggio Lighthouse da telefono 82 (la pagina del salone è a 95). Ottimizzare l'immagine del telefono in alto e il CSS che blocca il disegno.
- **DMARC** da `none` a `quarantine`.
- **Staging separato:** un secondo progetto Supabase per le prove, invece di provare sul database vero.
- **Prova su dispositivi veri:** Safari iOS, Android, screen reader.

## Idee
- Accesso con Apple e Google (i pulsanti ci sono, spenti).
- Promemoria via WhatsApp.
- Dominio `app.taglendo.it` separato dalle pagine dei saloni.
- Importazione dei clienti da un file.

## Dopo la Fase 10 (agenda e telefono)
- **Orari proposti nel nuovo appuntamento:** oggi sono i primi liberi del giorno mostrato; valutare «dopo ora, anche nei giorni seguenti».
- **Servizio abituale del cliente** preselezionato nel nuovo appuntamento (richiede il dato nella lista clienti).
- **Barra destra:** «Da richiamare» e altre voci, se servono.
- **Foto dei barbieri** sulla pagina pubblica (oggi c'è l'iniziale).
- **Animazione di cambio pagina** nel gestionale (da fare senza trasformazioni sul contenitore, che spostano i pulsanti fissi).
- **Avviso in console (solo sviluppo)** di Next sull'immagine grande dell'agenda nelle pagine d'accesso su desktop.
- **Prova su telefoni veri:** zona sicura, tastiera, scorrimento tra giorni, installazione come app.
