# Fasi di lavoro e prompt per Claude Code

Si lavora una fase alla volta. A fine fase ci vogliono:
- test verdi;
- un commit;
- una prova a mano su telefono (anche dal simulatore di Chrome) e su computer.

I prompt sono da incollare così come sono; Claude Code legge `CLAUDE.md` da solo.

## Rilascio gratuito (beta) e ordine delle fasi

La prima uscita è **gratuita, solo web, con registrazione**: senza pagamenti e senza app negli store. Si usa per circa un mese per vedere come risponde il prodotto. Intanto si sviluppa la parte a pagamento. Dopo, l'app.

**Ordine**
1. **Release gratuita:** Fasi 0–5, 7 e 8, poi la 9 (prove e beta).
2. **In parallelo alla beta:** Fase 6 (abbonamento), su un branch separato e spenta da `BILLING_ENABLED=false` fino al lancio dei pagamenti.
3. **Dopo:** app nativa per gli store (fuori dalla v1). Nella beta il gestionale si può aggiungere alla schermata Home grazie alla PWA (Fase 5).

**Cosa cambia nella beta**
- Con `BILLING_ENABLED` spento ogni salone ha l'accesso completo e nessuna scadenza (`hasActiveAccess` in `lib/billing.ts`). La prenotazione online non passa mai a "solo telefono" per abbonamento.
- Fino a 3 poltrone per tutti. Niente schermate B (abbonamento), niente Stripe, niente fattura elettronica.
- Testi cambiati rispetto ai design (approvati):
  - registrazione: «Gratis in beta · Senza carta · Disdici quando vuoi»;
  - "Tutto pronto": «Beta gratuita: non ti chiediamo nessun pagamento.»;
  - poltrone: resta solo «Gli inviti ai barbieri li mandi dopo.»;
  - operatori: «Hai già tre poltrone: è il massimo.»;
  - sito commerciale (Fase 7): la sezione prezzi dice «Gratis durante la beta».

**Cosa serve comunque, anche gratis** (si trattano dati personali dei clienti dei saloni)
- Privacy, termini e cookie (Fase 7), con revisione di un consulente.
- Eliminazione dell'account ed esportazione dei dati (Fase 8).
- Accordo sul trattamento dei dati (DPA) con i saloni, accettato alla registrazione.
- SPF, DKIM e DMARC sul dominio delle email.
- Backup di Supabase e controllo di sicurezza della RLS.
- Piani dei servizi adatti a saloni veri: i piani gratuiti di Supabase, Vercel e Resend hanno limiti (pausa del progetto, uso non commerciale, quote di invio). Verificare i prezzi attuali.

**Quando si accendono i pagamenti**
- Si imposta `BILLING_ENABLED=true`.
- Ai saloni della beta si dà una nuova prova di 15 giorni: `trial_ends_at = now() + interval '15 days'` e `sub_status = 'trialing'`.
- Si avvisano in anticipo: la cosa va scritta nei termini fin dalla registrazione.

**Come si misura il mese** (interrogazioni sui dati esistenti, nessun tracciamento nuovo)
- Saloni registrati e quanti finiscono il primo avvio (`onboarding_step = 5`).
- Quanti hanno appuntamenti dopo una settimana, e quanti ne creano ancora alla quarta.
- Quante prenotazioni arrivano dal link (`source = 'online'`).
- Da 3 a 5 saloni pilota con un canale diretto per le segnalazioni.

---

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

### Fase 6 · Abbonamento (2–3 settimane) · dopo la release gratuita, in parallelo alla beta
> Va sviluppata dietro l'interruttore `BILLING_ENABLED` (spento nella beta).

> Stripe Billing: prodotti Solo e Salone, prova di 15 giorni senza carta, pagamento (B2), stato attivo con fatture (B5), disdetta (B6), passaggio di piano al superamento delle poltrone (B7), prova finita (B3), pagamento non riuscito con 7 giorni di tolleranza (B4). Webhook per aggiornare sub_status e piano. Quando l’abbonamento non è attivo la pagina pubblica passa a solo telefono. Prepara il punto in cui si collegherà il provider di fattura elettronica.

### Fase 7 · Sito commerciale e pagine legali (1–1,5 settimane)
> Nella beta la sezione prezzi dice «Gratis durante la beta»; i prezzi veri tornano con la Fase 6.

> Ricostruisci design/Sito Taglendo.dc.html con header, hero, sezioni, prezzi, FAQ e footer legale; “Accedi” porta ad /accedi e “Prova gratis” a /registrati. Pagine /privacy, /termini, /cookie (G1, G4, G5) con i testi segnaposto marcati come bozza. Metadati SEO, immagine di anteprima per i social, favicon dall’icona, sitemap.

### Fase 8 · Robustezza (1,5 settimane)
> Stati D1–D4 ovunque (offline con coda delle modifiche, caricamento a segnaposto, errore con “Riprova”, sessione scaduta). Accessibilità (focus visibile, etichette, contrasto, tastiera), prefers-reduced-motion, prestazioni (Lighthouse ≥ 90 su mobile per la pagina pubblica). Profilo ed eliminazione account (C8, C9). Sentry.

### Fase 9 · Prove e beta (3–4 settimane)
> Rivedi docs/06-casi-limite.md e scrivi i test mancanti. Prepara un ambiente staging con 3 saloni demo. Poi seguiamo docs/07-checklist-lancio.md.
