# Taglendo — contesto del progetto

> Fotografia dello stato al **23 novembre 2026**, ricavata dal codice e dai documenti in `docs/`.
> Dove codice e documenti divergono, vale il codice. Le istruzioni permanenti per Claude Code restano in `CLAUDE.md`.

## 1. Cos'è

Agenda e prenotazioni online per **barberie da 1 a 3 poltrone, in Italia**. Una sola applicazione serve tre superfici che condividono gli stessi dati:

| Superficie | Per chi | Dove |
|---|---|---|
| **Sito pubblico** | clienti che cercano una barberia, barbieri che valutano Taglendo | `/`, `/cerca`, `/barbieri/[città]`, `/per-i-saloni`, `/per-i-saloni/funzioni` |
| **Gestionale** (web app / PWA) | titolare e barbieri | `/agenda`, `/clienti`, `/listino`, `/salone`, `/statistiche`, `/impostazioni`, `/profilo`… |
| **Pagina del salone** | clienti finali | `/[slug]` e `/[slug]/prenotazione/[token]` |

In più c'è il pannello `/admin` del creatore (non per i saloni).

**Perimetro v1:** solo web. Fuori: app native, WhatsApp automatico (resta manuale via `wa.me`), statistiche avanzate.
**Fase attuale:** beta gratuita, in preparazione ai saloni pilota. Pagamenti spenti (`BILLING_ENABLED=false`).

## 2. Stack

- **Next.js 16.4** (App Router, `cacheComponents`, `partialPrefetching`), React 19.3, TypeScript strict. Le convenzioni di questa versione differiscono da quelle note: leggere `node_modules/next/dist/docs/` prima di scrivere codice (vedi `AGENTS.md`).
- **Supabase**: Postgres, Auth, RLS, Storage (foto), `pg_cron` + `pg_net`. Nessuna Edge Function in `supabase/functions/` (vuota): la logica sta in funzioni SQL e route Next.
- **Email**: Resend + React Email. **Push**: Web Push (VAPID). **Errori**: Sentry. **Hosting**: Vercel.
- **Mappe**: Leaflet + OpenStreetMap; geocoding con Google (opzionale) o centro del comune da `lib/places/comuni.json` (GeoNames).
- **Stile**: CSS Modules solo sui token di `tokens/tokens.css` (Manrope 400–700, mai 800). Lint con ESLint + Stylelint.
- **Test**: Vitest (progetti `unit` e `db`), Playwright (`e2e/`, con axe per l'accessibilità), Lighthouse.
- **Stripe**: dipendenza non installata, `lib/stripe/` vuota, webhook risponde 501.

Domini: `taglendo.it` (sito, pagine saloni e per ora anche gestionale). `app.taglendo.it` separato resta un'idea.

## 3. Comandi

```bash
npm install
npm run db:start      # Supabase locale (serve Docker): migrazioni + seed
npm run dev           # http://localhost:3000
npm run db:reset      # ricrea il DB con i dati demo di Barberia Saragozza
npm run db:types      # rigenera lib/supabase/database.types.ts dopo una modifica allo schema
npm test              # Vitest, regole pure e formati
npm run test:db       # test del database (RLS, vincoli, funzioni SQL)
npm run test:e2e      # Playwright
npm run lint && npm run typecheck
```

Mailpit (email locali): http://127.0.0.1:54324. `/dev/ui` mostra i componenti base.
Account demo (password `taglendo-demo`): `andrea@barberia-saragozza.example` (titolare), `marco@barberia-saragozza.example` (barbiere). Altri account in `docs/account-di-prova.md`.

Variabili d'ambiente (`.env.example`): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_AUTH_APPLE|GOOGLE`, `BILLING_ENABLED`, `NEXT_PUBLIC_SENTRY_DSN`, `SITE_PRIVATE`/`PREVIEW_USER`/`PREVIEW_PASSWORD`/`PREVIEW_SECRET`, `GOOGLE_MAPS_API_KEY`. In produzione anche: `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.

## 4. Struttura del repository

```
app/
  (marketing)/        privacy, termini, cookie
  (site)/             home clienti (/), ricerca (/cerca, /barbieri/[citta])
  (saloni)/           /per-i-saloni e /per-i-saloni/funzioni
  (salon)/[slug]/     pagina pubblica, gestione prenotazione, calendario.ics
  (auth)/             accedi, registrati, verifica, password, nuova-password, invito/[token]
  (app)/              gestionale
  (gate)/             "a breve online" e accesso riservato (anteprima privata)
  admin/              pannello del creatore
  primo-avvio/[step]/, pronto/
  api/                cron/run, indirizzi, luoghi, reauth, session, stripe/webhook
  auth/               callback, conferma
components/           per area (agenda, clients, listino, booking, marketing, onboarding, admin, offline, ui…)
lib/                  logica per area; rules/ = regole pure con test; copy/ = tutti i testi; supabase/
supabase/             migrations/ (27), seed.sql, tests/ (test DB), demo-staging*.sql, templates/
e2e/                  Playwright (31 spec)
design/               prototipi HTML di riferimento (non sono codice)
docs/                 documentazione di prodotto e regole
proxy.ts              middleware: anteprima privata, sessione, rotte protette
public/sw.js          service worker (notifiche + offline)
```

I testi dell'interfaccia stanno in `lib/copy/*` (italiano, definitivi: non riscriverli).

## 5. Funzionalità attive

### 5.1 Accesso e primo avvio
- Registrazione con email + password robusta, **verifica con codice a 6 cifre**, accettazione termini, recupero e cambio password, "Ricordami", sessione di 30 giorni con ri-autenticazione senza perdere il lavoro (`/api/reauth`, `SessionGuard`).
- Apple/Google: pulsanti presenti ma **spenti** (`NEXT_PUBLIC_AUTH_*=false`).
- **Inviti ai barbieri** (`/invito/[token]`, validi 7 giorni, email precompilata).
- **Primo avvio in 4 passi** (salone → orari → servizi → poltrone) con anteprima su desktop, poi `/pronto` con il link da condividere. Orari predefiniti: mar–sab 9–19, pausa 13–14:30.
- Suggerimento indirizzi (Google Places) e posizione del salone per la ricerca.

### 5.2 Agenda (`/agenda`)
- Viste: griglia, righe, elenco (desktop); poltrone, lista compatta, griglia (telefono). Calendario mensile, barra della settimana, swipe tra giorni, filtro per operatore.
- Crea appuntamento (flusso a passi: cliente, orario, "tutti gli orari", cliente nuovo, "dal buco", prezzo), sposta, annulla, segna completato / non presentato, "Cliente in negozio", modifica prezzo.
- Orari liberi calcolati dal DB (`free_slots`); la **sovrapposizione la impedisce un vincolo di esclusione** del database.
- Aggiornamento automatico, guida iniziale (tour, `tour_seen` nei metadati utente), link WhatsApp manuale (`wa.me`).

### 5.3 Clienti (`/clienti`, `/clienti/[id]`)
- Rubrica con lettere e ricerca (nome o ultime cifre del telefono), filtri, "da richiamare", scheda con note, storico e statistiche, foto del cliente (ridimensionate lato client).
- Esportazione CSV (rubrica e singolo cliente), eliminazione cliente (storico cancellato, incassi anonimi, appuntamenti futuri annullati).
- Il permesso "vedere telefono ed email" è rispettato.

### 5.4 Listino, orari, chiusure (`/listino`)
- Servizi (nome, durata, prezzo in centesimi, attivo), con durata attività.
- Orari per giorno anche **a più fasce**, **orari per singolo operatore**, chiusure ed eventuali ferie, **festività nazionali** (+ santo patrono) che creano da sole le chiusure per ogni anno.

### 5.5 Salone e impostazioni
- `/salone` (e `/link`): link di prenotazione e impostazioni del salone.
- `/impostazioni/pagina`: foto (fino a 8 con copertina), logo, presentazione, prenotazione online sì/no, prezzi visibili sì/no, "Compari nella ricerca di Taglendo".
- `/impostazioni/regole`: preavviso minimo, anticipo massimo, passo degli orari (15/30), annullamento online e limite.
- `/impostazioni/operatori`: poltrone (max 3), inviti, ruoli titolare/barbiere con tre permessi (vedere agenda di tutti, fissare/spostare, vedere contatti), colore in agenda, "prenotabile online".
- `/impostazioni/email`: attivazione di conferma, promemoria (anticipo 2/4/12/24/48 h), annullamento; anteprima email.
- `/impostazioni/avvisi`: avvisi al barbiere (nuova prenotazione, annullamento, riepilogo delle 8:00) via notifica, email o entrambi; "solo i miei appuntamenti".
- `/statistiche`: per giorno / settimana / anno, solo titolare, "per operatore" solo con più barbieri.
- `/notifiche`: registro attività con contatore non letti.
- `/profilo`: foto, telefono, colore, password, **esportazione dati**, **eliminazione account** (digitare ELIMINA; pagina offline subito, dati cancellati entro 30 giorni).
- `/impostazioni/abbonamento`: **rimanda a `/impostazioni`** finché `BILLING_ENABLED` è spento; con i pagamenti accesi è ancora un segnaposto (Fase 6).

### 5.6 Pagina pubblica del salone (`/[slug]`)
- Foto con visore, team, listino, orari, mappa. Prenotazione a passi (cosa · con chi · quando · dati) con **codice via email** (6 cifre, 10 min, 5 tentativi, rinvio dopo 60 s), privacy obbligatoria, "nessuna preferenza" sull'operatore, gestione dell'orario conteso.
- Gestione della prenotazione dal link (`/[slug]/prenotazione/[token]`): dettaglio, annullamento (entro il limite), file `.ics` per il calendario.
- Modalità **solo telefono** (`booking_online=false`) e **prezzi nascosti** (`show_prices=false`), anche combinate. Banner cookie con preferenze.

### 5.7 Sito pubblico e ricerca
- **Home clienti** con ricerca per città o "Vicino a me"; `/cerca` con elenco + mappa (entro 30 km, altrimenti fino a 150 km; filtri per servizio e data); `/barbieri/[città]` per SEO.
- Un salone compare solo se: non eliminato, primo avvio finito, ha una posizione, ha almeno un servizio attivo, accesso valido, non nascosto né da lui né da Taglendo (`private.is_listed`, `public.find_salons`).
- `/per-i-saloni` (landing commerciale: "gratis" durante la beta, conto alla rovescia sul prezzo) e `/per-i-saloni/funzioni`. Pagine legali `/privacy`, `/termini`, `/cookie` (**bozze**), `sitemap`, `robots`, `manifest`, immagine og.

### 5.8 Email, notifiche, cron
- Email React Email: **codice, conferma, promemoria, annullata, spostata, invito, avviso allo staff**. Il codice è sempre attivo; conferma/promemoria/annullata le può spegnere il salone.
- **Web push** al barbiere con service worker; se nessun dispositivo è attivo ripiega sull'email. Su iPhone solo con l'app aggiunta alla Home.
- **Cron** (pg_cron → `POST /api/cron/run`, ogni ora, `Bearer CRON_SECRET`): riepiloghi 8:00–10:59, promemoria 18:00–20:59 (Roma), con segni anti-doppione (`summary_runs`, `reminder_sent_at`); sincronizza le festività e pulisce codici/inviti scaduti. Lancio manuale: `?job=reminders|summaries|none`.

### 5.9 PWA e offline
- Installabile (manifest, icone), `public/sw.js`: notifiche, cache dei file e dell'ultima agenda vista (solo in produzione, `?cache=1`), `offline.html`.
- Coda offline degli appuntamenti (`lib/offline`, `components/offline`) che si sincronizza al ritorno della rete.

### 5.10 Prova, accesso e blocco
- **Prova di 30 giorni** dalla registrazione, senza carta; avviso da 7 giorni prima («La tua prova scade tra N giorni», scrivere a `aiuto@taglendo.it`).
- Prova finita o salone sospeso ⇒ **salone bloccato**: gli appuntamenti già fissati restano visibili, non si può scrivere altro, la pagina pubblica sparisce, niente prenotazioni online, esce dalla ricerca. Il blocco lo applica il DB (`private.salon_lock`, `guard_suspended`); `lib/billing.ts` ha la stessa regola per l'interfaccia. **Vale anche con i pagamenti spenti.**

### 5.11 Pannello `/admin` (creatore)
Accesso separato (`/admin/accedi`), tabella `platform_admins`. Panoramica con KPI e grafici, elenco saloni (tabella/schede, filtri), scheda salone, utenze, gestione amministratori, note interne e **registro delle azioni** (`admin_audit`); azioni: sospendere/riattivare, nascondere dalla ricerca, prolungare la prova. Dei clienti finali escono solo conteggi.

### 5.12 Anteprima privata
Con `SITE_PRIVATE=true` il sito mostra solo `/a-breve`; si entra da `/accesso-riservato` con utente e password (cookie firmato da `PREVIEW_SECRET`).

## 6. Regole di business essenziali (dettaglio in `docs/04-regole.md`)

- Orari in `timestamptz` UTC, mostrati in `Europe/Rome`. Prezzi in centesimi, **copiati nell'appuntamento** alla prenotazione.
- Ogni tabella ha `salon_id` e RLS: un salone non vede mai i dati di un altro (test in `supabase/tests/rls.test.ts`).
- Stati appuntamento: `confermato`, `completato`, `annullato`, `non_presentato`; origine `manuale`, `online`, `in_negozio`.
- Spostamenti solo dal salone (email "spostata" al cliente); il cliente annulla dal link fino a `cancel_limit_min` prima (default 2 h) se `cancel_online` è attivo.
- Promemoria non inviato se la prenotazione è stata fatta quando mancava già meno dell'anticipo.
- Inviti validi 7 giorni; sessione 30 giorni.
- Limiti campi: nome salone 60, operatore 40, servizio 60, cliente 60, note 500, descrizione 160, telefono 20.

## 7. Schema dati (principali tabelle)

`salons`, `members` (operatori = poltrone, max 3), `opening_hours`, `opening_ranges`, `member_hours`, `member_ranges`, `closures`, `services`, `clients`, `appointments`, `booking_codes`, `notification_prefs`, `email_prefs`, `push_subscriptions`, `summary_runs`, `salon_photos`, `activity`, `platform_admins`, `admin_notes`, `admin_audit`.
Ultime migrazioni: `ricerca_saloni*`, `ridisegno_sito`, `orari_operatori`, `admin_taglendo`, `admin_utenze`, `prova_30_giorni`. Funzioni SQL chiave: `free_slots`, `find_salons`, `salon_lock`, `is_listed`, e le funzioni `admin_*`. Le funzioni chiamabili senza accesso sono solo le due della pagina pubblica.

## 8. Cosa NON è attivo

| Funzione | Stato |
|---|---|
| **Stripe / abbonamenti** (Fase 6) | Non iniziata: webhook 501, nessun pacchetto, `/impostazioni/abbonamento` è un segnaposto. Piani previsti: Solo 9,90 € (1 poltrona), Salone 19,90 € (fino a 3), + IVA 22% |
| **Fattura elettronica** | Non iniziata (serve con i pagamenti) |
| Accesso Apple / Google | Pulsanti presenti, provider spenti |
| Promemoria WhatsApp automatici | Fuori v1: solo link manuale |
| App nativa iOS/Android | Dopo la beta |
| Disattivazione di un barbiere dall'app | Il DB la gestisce, manca la schermata |
| Email di annullamento ai clienti all'eliminazione dell'account | Da sistemare |
| `components/booking/` | Vuota (`.gitkeep`) |
| Plausible sul sito commerciale | Previsto in architettura, non verificato nel codice |

## 9. Da fare prima del lancio (`docs/07-checklist-lancio.md`)

- **Legale:** ragione sociale/P.IVA/indirizzo (oggi segnaposto `[…]` in `lib/site.ts`), revisione di privacy/termini/cookie, DPA con i saloni, registro dei trattamenti.
- **Tecnica:** backup Supabase (piano Pro o backup nostro, ripristino provato); DMARC da `none` a `quarantine`; prova email su Gmail/Outlook/iCloud; avvisi Sentry; **ruotare le chiavi incollate in chat durante lo sviluppo**; revisione esterna di RLS/chiavi; prova su Safari iOS, Android e screen reader; staging separato; source map Sentry.
- **Contenuti:** foto con licenza al posto di quelle Unsplash, schermate del sito rigenerate dall'app vera, casella `aiuto@taglendo.it`.
- **Beta:** 3–5 saloni pilota per 3–4 settimane.
- **Prestazioni:** home Lighthouse mobile 82 (pagina salone 95, registrazione 96, accesso 98).

Quando si accenderanno i pagamenti: `BILLING_ENABLED=true` e ai saloni della beta una nuova prova di 30 giorni, avvisandoli prima.

## 10. Stato dei test (ultimo dato in checklist)

257 e2e passati su Chrome (telefono e desktop emulati), 0 falliti; 280 test unitari e DB. Axe verde sulle pagine principali. 23 file di test del database in `supabase/tests/`. Ogni regola di `docs/04-regole.md` deve avere almeno un test; la copertura dei casi limite è in `docs/09-copertura-casi-limite.md`.

## 11. Fonti di verità

1. `CLAUDE.md` — regole di stile, di codice e "non fare".
2. `design/ridisegno-sito-2026-11/` — sito pubblico (5 pagine); poi `design/ridisegno-2026-11/` — gestionale e pagina salone; poi `design/*.dc.html`. I design sono prototipi da ricostruire, non da copiare; la barra grigia del prototipo non va costruita.
3. `docs/04-regole.md` (regole), `docs/02-modello-dati.md` (dati; è una bozza, fa fede `supabase/migrations/`), `docs/03-schermate-e-percorsi.md` (rotte).
4. Se design e documenti sono in conflitto, **chiedere prima di scegliere**. Prima di modifiche ampie proporre un piano. Non aggiungere funzioni fuori dalla v1 senza chiedere.

## 12. Note per chi lavora sul codice

- Colori e misure solo dai token; albicocca `#F28C6F` solo come accento, mai sotto testo lungo; contrasto ≥ 4,5:1; controlli alti 48 px; animazioni 150–300 ms con `cubic-bezier(0.23,1,0.32,1)` e `prefers-reduced-motion`.
- Date e prezzi in formato italiano (`Ven 30 ottobre`, `20 €`).
- Niente librerie di componenti con stile proprio. Niente chiavi nel codice.
- Dopo una modifica allo schema: `npm run db:types`.
- Questo file è stato ricavato da una clone superficiale (un solo commit): la cronologia dei commit non è stata consultata.
