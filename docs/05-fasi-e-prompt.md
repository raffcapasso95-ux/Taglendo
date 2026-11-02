# Fasi di lavoro e prompt per Claude Code

Si lavora una fase alla volta. A fine fase ci vogliono:
- test verdi;
- un commit;
- una prova a mano su telefono (anche dal simulatore di Chrome) e su computer.

I prompt sono da incollare così come sono; Claude Code legge `CLAUDE.md` da solo.

## Prima di iniziare (tu)
- Account necessari: GitHub, Vercel, Supabase, Stripe (modalità test), Resend, Sentry.
- Installazioni: Node 20+, Docker (per Supabase in locale), Supabase CLI, Stripe CLI.
- Copia nel repository `CLAUDE.md`, `docs/`, `tokens/` e `design/`.

---

### Fase 0 · Avvio (≈ 1 settimana)
> Leggi CLAUDE.md e tutti i file in docs/. Crea un progetto Next.js (App Router, TypeScript strict) con la struttura di docs/01-architettura.md. Importa tokens/tokens.css e il font Manrope da design/fonts. Crea i componenti base in components/ui (Button primario/secondario/accent/pericolo, Field con errore, Segmented, Toggle, Checkbox, Card, Sheet per telefono, Modal per desktop, Toast) copiando esattamente misure e colori dai file in design/. Fai una pagina /dev/ui che li mostra tutti. Configura Supabase in locale e crea la prima migrazione da docs/02-modello-dati.md, con RLS e un seed con i dati demo di Barberia Saragozza (presi da design/Taglendo App.dc.html, funzione makeData). Prima di scrivere codice mostrami il piano.

### Fase 1 · Accesso e primo avvio (2–3 settimane)
> Implementa le schermate A1–A10 e C7 (telefono e desktop) di design/Schermate mancanti.dc.html con Supabase Auth: email + password con verifica a codice, recupero password, Apple e Google (lascia i provider configurabili da variabili d’ambiente). Alla registrazione crea il salone in prova (trial_ends_at = +15 giorni) e il membro titolare. Il primo avvio in 4 passi salva salone, orari, servizi e poltrone; su desktop mostra l’anteprima a destra come in A6-D–A9-D. Aggiungi inviti operatori (7 giorni) e ruoli. Test: un utente non vede mai i dati di un altro salone.

### Fase 2 · Agenda (4–5 settimane)
> Ricostruisci la scheda Agenda di design/Taglendo App.dc.html: su desktop barra laterale sempre chiusa a icone, viste Griglia/Righe/Elenco, filtro per operatore, selettore giorni, stati vuoti; su telefono viste Poltrone/Lista compatta/Griglia e barra in basso. Crea, sposta, annulla, segna completato o non presentato, “Cliente in negozio”. Usa la funzione free_slots e il vincolo di esclusione del database per gli orari contesi (mostra gli alternativi come nel prototipo). Chiusure e ferie (C2, C3) con avviso se ci sono appuntamenti. Orari in Europe/Rome: aggiungi test per i giorni del cambio d’ora.

### Fase 3 · Clienti (1,5–2 settimane)
> Scheda Clienti: rubrica con lettere, ricerca per nome o ultime cifre del telefono, filtri, scheda con note e storico, stati vuoti (rubrica vuota, nessun risultato). Esporta in CSV ed elimina cliente come in C12. Rispetta il permesso “vedere telefono ed email dei clienti”.

### Fase 4 · Pagina pubblica e prenotazione (3–4 settimane)
> Pagina /[slug] da design/Sito Barberia Saragozza.dc.html: hero, barbieri, listino, orari, prenotazione a fisarmonica in 3 sezioni, codice via email (6 cifre, 10 minuti, 5 tentativi), casella privacy obbligatoria, banner cookie con preferenze (E8, E9). Rispetta booking_online, cancel_online e show_prices in tempo reale (docs/04-regole.md). Pagina di gestione /[slug]/prenotazione/[token] con E1–E5. Tutta la prenotazione passa da una funzione server che ricontrolla le regole. Test end-to-end con Playwright: prenota, annulla, troppo tardi, slot conteso, solo telefono, prezzi nascosti.

### Fase 5 · Email e notifiche (1,5–2 settimane)
> Email F1–F6 con React Email, identiche a design/Schermate mancanti.dc.html sezione F, inviate con Resend. Promemoria alle 18:00 del giorno prima con cron. Impostazioni C6 e C11. Notifiche web push al barbiere (D5) con service worker; rendi il gestionale installabile come PWA (manifest, icone da assets/taglendo-icon.svg).

### Fase 6 · Abbonamento (2–3 settimane)
> Stripe Billing: prodotti Solo e Salone, prova di 15 giorni senza carta, pagamento (B2), stato attivo con fatture (B5), disdetta (B6), passaggio di piano al superamento delle poltrone (B7), prova finita (B3), pagamento non riuscito con 7 giorni di tolleranza (B4). Webhook per aggiornare sub_status e piano. Quando l’abbonamento non è attivo la pagina pubblica passa a solo telefono. Prepara il punto in cui si collegherà il provider di fattura elettronica.

### Fase 7 · Sito commerciale e pagine legali (1–1,5 settimane)
> Ricostruisci design/Sito Taglendo.dc.html con header, hero, sezioni, prezzi, FAQ e footer legale; “Accedi” porta ad /accedi e “Prova gratis” a /registrati. Pagine /privacy, /termini, /cookie (G1, G4, G5) con i testi segnaposto marcati come bozza. Metadati SEO, immagine di anteprima per i social, favicon dall’icona, sitemap.

### Fase 8 · Robustezza (1,5 settimane)
> Stati D1–D4 ovunque (offline con coda delle modifiche, caricamento a segnaposto, errore con “Riprova”, sessione scaduta). Accessibilità (focus visibile, etichette, contrasto, tastiera), prefers-reduced-motion, prestazioni (Lighthouse ≥ 90 su mobile per la pagina pubblica). Profilo ed eliminazione account (C8, C9). Sentry.

### Fase 9 · Prove e beta (3–4 settimane)
> Rivedi docs/06-casi-limite.md e scrivi i test mancanti. Prepara un ambiente staging con 3 saloni demo. Poi seguiamo docs/07-checklist-lancio.md.
