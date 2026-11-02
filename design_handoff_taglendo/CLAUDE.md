# Taglendo — istruzioni per Claude Code

## Prodotto
Agenda e prenotazioni online per barberie da 1 a 3 poltrone, in Italia. Tre superfici condividono gli stessi dati: il sito commerciale, il gestionale del barbiere (web app/PWA) e la pagina pubblica di ogni salone (`/[slug]`). La v1 è **solo web**.

## Fonti di verità
- Design: `design/*.dc.html`. Sono prototipi HTML ad alta fedeltà: vanno ricostruiti, non copiati. Le schermate in `design/Schermate mancanti.dc.html` hanno un codice (es. `C4`, `C4-D` per desktop).
- Design system: `design/uploads/design-system.html` e `tokens/tokens.css`.
- Regole: `docs/04-regole.md`. Dati: `docs/02-modello-dati.md`. Rotte: `docs/03-schermate-e-percorsi.md`.
- Se design e documenti sono in conflitto, chiedi prima di scegliere.

## Stack
Next.js (App Router) + TypeScript in modalità strict, Supabase (Postgres, Auth, RLS, Edge Functions, cron), Stripe Billing, Resend + React Email, Vercel, Sentry. Stile con CSS Modules o Tailwind configurato **solo** sui token di `tokens/tokens.css`: niente colori o misure fuori dai token.

## Regole di stile
- Colori, spaziature, angoli e altezze vengono **solo** dai token. Mai valori esadecimali sparsi nei componenti.
- Manrope, pesi 400/500/600/700. Mai 800.
- Albicocca `#F28C6F` solo come accento, pulsanti accent o fasce senza testo lungo. Il testo va sempre su panna, bianco, pesca o prugna.
- Contrasto minimo del testo 4,5:1. Testo secondario `#725C66` solo su fondi chiari.
- Controlli alti 48 px, aree di tocco di almeno 44 px.
- I testi dell'interfaccia sono quelli dei design, in italiano. Non riscriverli. Date e prezzi in formato italiano (`Ven 30 ottobre`, `20 €`).
- Animazioni brevi (150–300 ms), `cubic-bezier(0.23,1,0.32,1)`. Rispettare `prefers-reduced-motion`.

## Regole di codice
- Ogni tabella ha `salon_id` e le policy RLS impediscono a un salone di vedere i dati di un altro. Va testato.
- Orari salvati in `timestamptz` (UTC) e mostrati in `Europe/Rome`.
- La sovrapposizione degli appuntamenti la impedisce **il database** (vincolo di esclusione), non solo l'interfaccia.
- Prezzi in centesimi (`price_cents`). Il prezzo si copia nell'appuntamento al momento della prenotazione.
- Niente chiavi segrete nel codice. Si usano le variabili d'ambiente. Stripe resta in modalità test fino al lancio.
- Ogni regola di `docs/04-regole.md` ha almeno un test automatico (Vitest), e i flussi critici hanno test end-to-end (Playwright): prenotazione, annullamento, registrazione, abbonamento.
- Lavora una fase alla volta (`docs/05-fasi-e-prompt.md`). A fine fase: test verdi, commit, breve riepilogo di cosa manca.
- Prima di modifiche ampie, proponi un piano e aspetta conferma.

## Non fare
- Non costruire la barra grigia di controllo del prototipo (Dati / Simula / Vista).
- Non aggiungere funzioni fuori dalla v1 senza chiedere.
- Non usare librerie di componenti con uno stile proprio (es. Material) al posto del design system.
