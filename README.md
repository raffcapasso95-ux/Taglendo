# Handoff: Taglendo — versione web (v1)

Agenda e prenotazioni online per barberie da 1 a 3 poltrone. Questo pacchetto contiene tutto il design e le istruzioni per costruire la **v1 solo web** con Claude Code: niente app negli store.

## Cosa costruire (perimetro v1)

1. **Sito Taglendo**: la pagina commerciale per i barbieri, più registrazione, accesso e pagine legali.
2. **Gestionale del barbiere**: una web app responsive, su telefono e computer, installabile come PWA. Comprende agenda, clienti, link di prenotazione, listino e orari, impostazioni e abbonamento.
3. **Pagina pubblica del salone** (`/[slug]`): listino, orari, prenotazione in 3 passi con codice via email, gestione e annullamento della prenotazione, modalità “solo telefono” e prezzi nascosti.
4. **Servizi di fondo**:
   - email automatiche e promemoria programmati;
   - abbonamenti Stripe con prova di 15 giorni;
   - fattura elettronica;
   - notifiche web push.

**Fuori dalla v1:** app native su App Store e Google Play, WhatsApp automatico (resta manuale tramite link `wa.me`) e statistiche avanzate.

## I file di design sono riferimenti, non codice da copiare

I file `.dc.html` in `design/` sono **prototipi HTML** che mostrano aspetto e comportamento. **Non sono codice di produzione.** Il compito è ricostruirli nello stack scelto (vedi `docs/01-architettura.md`), con componenti veri e dati veri.

Per aprirli:
1. Avvia un server locale nella cartella `design/`, per esempio `npx serve design`.
2. Apri il file nel browser.

Servono `support.js`, `assets/` e `fonts/` nella stessa cartella.

## Fedeltà: alta

Colori, caratteri, spaziature, angoli, testi e stati sono **definitivi**. Va riprodotto tutto fedelmente. I testi sono in italiano e vanno usati così come sono.

## File di design

| File | Cosa contiene |
|---|---|
| `design/Sito Taglendo.dc.html` | Sito commerciale: hero, come funziona, prima e dopo, “online o al telefono”, prezzi, FAQ, iscrizione, footer legale |
| `design/Taglendo App.dc.html` | **Prototipo interattivo del gestionale** (telefono e desktop): agenda (griglia, righe, elenco), appuntamenti, clienti, link, listino e orari, impostazioni, anteprima della pagina cliente. La barra grigia in alto (Dati / Simula / Vista / Operatori) serve solo al prototipo e **non va costruita** |
| `design/Sito Barberia Saragozza.dc.html` | Modello della pagina pubblica di un salone, con flusso di prenotazione, banner cookie e casella privacy. Il nome “Barberia Saragozza” è un dato di esempio |
| `design/Schermate mancanti.dc.html` | Tutte le altre schermate, telefono e desktop (selettore in alto): A accesso e primo avvio · B abbonamento · C impostazioni avanzate · D stati di sistema · E pagina cliente e casi limite · F email · G pagine legali. Ogni schermata ha un codice (A1, A1-D, …) |
| `design/Piano di sviluppo.dc.html` | Stack, fasi, tempi, costi e rischi |
| `design/uploads/design-system.html` | Design system ufficiale: palette, caratteri, componenti, regole d’uso |

## Immagini delle schermate (`screenshots/`)
- `telefono/` e `desktop/`: tutte le schermate di `Schermate mancanti`, una per file, con lo stesso codice (A1.png, A1-D.png…). Ogni immagine riporta in alto il codice e una nota sul comportamento.
- `email/`: F1–F6.
- `sito/`: il sito Taglendo a pagina intera, più le pagine legali G1–G5.
- `app/` e `salone/`: agenda, listino e pagina di prenotazione.

Gestionale e pagina del salone sono **interattivi**: per stati, animazioni e casi limite fa fede il file `.dc.html` aperto nel browser, non l'immagine.

## Documentazione

| File | Contenuto |
|---|---|
| `CLAUDE.md` | **Da copiare nella radice del repository.** Istruzioni permanenti per Claude Code |
| `docs/01-architettura.md` | Stack, struttura delle cartelle, domini, ambienti |
| `docs/02-modello-dati.md` | Tabelle, vincoli e sicurezza (SQL per Supabase/PostgreSQL) |
| `docs/03-schermate-e-percorsi.md` | Ogni schermata collegata alla sua rotta e al file di design |
| `docs/04-regole.md` | Regole di prenotazione, annullamento, prova, piani, email, prezzi nascosti, solo telefono |
| `docs/05-fasi-e-prompt.md` | Le fasi di lavoro, con i prompt pronti da incollare in Claude Code |
| `docs/06-casi-limite.md` | Casi limite da testare |
| `docs/07-checklist-lancio.md` | Cosa verificare prima di aprire ai saloni |
| `tokens/tokens.css` | Variabili CSS del design system |

## Design token in breve

Il file completo è `tokens/tokens.css`.

- **Colori:**
  - albicocca `#F28C6F` (accento, mai come sfondo di testo lungo);
  - prugna `#3E2532` (testo e azioni principali);
  - panna `#FFF7F0` (fondo);
  - pesca `#F8D6C6` (evidenze);
  - superficie `#FFFFFF`, superficie tenue `#FBF0E9`;
  - testo secondario `#725C66`;
  - bordi `#E6D9DC` / `#A88C99`;
  - successo `#21624E`, attenzione `#8A4B16`, errore `#B43E4B`.
- **Carattere:** Manrope, pesi da 400 a 700 (mai 800). Testo 16/1,5. Etichette in maiuscolo a 12 px con spaziatura .14em.
- **Spaziature:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64.
- **Angoli:** campi 8, pulsanti 12, schede 16, pannelli 24.
- **Altezza dei controlli:** 48 px. Su telefono, area di tocco minima 44 px.

## Asset

- `assets/taglendo-logo.svg` è il logo su fondo chiaro. Per i fondi scuri c'è `taglendo-logo-light.svg`. Larghezza minima del logo intero: 160 px, con eccezioni discrete nei footer dei saloni.
- `assets/taglendo-icon.svg` è l'icona dell'app, `taglendo-symbol.svg` il simbolo.
- `assets/shot-*.png` sono schermate dell'app usate nel sito commerciale. Vanno rigenerate dall'app vera quando è pronta.
- `fonts/Manrope.ttf` è il carattere, a peso variabile.
- Le foto (Unsplash) sono **dimostrative** e vanno sostituite con foto con licenza.

## Da dove partire

1. Leggi `docs/05-fasi-e-prompt.md`.
2. Crea il repository e copia dentro `CLAUDE.md`, `docs/`, `tokens/` e `design/`.
3. Apri Claude Code nella cartella e incolla il prompt della **Fase 0**.

## Sviluppo in locale

Requisiti: Node 20+ e Docker in esecuzione.

```bash
npm install
npm run db:start          # Supabase locale: applica la migrazione e il seed
cp .env.example .env.local # poi incolla API_URL e ANON_KEY da `npx supabase status`
npm run dev               # http://localhost:3000/dev/ui per i componenti
```

- `npm run db:reset` ricrea il database con i dati demo di Barberia Saragozza. Le date sono relative al giorno del seed.
- Accessi demo (password `taglendo-demo`): `andrea@barberia-saragozza.example` (titolare), `marco@barberia-saragozza.example` (barbiere).
- `npm test`: test unitari. `npm run test:db`: test di RLS e vincoli sul database locale.
- `npm run lint` controlla anche che nei CSS non ci siano colori fuori dai token.
