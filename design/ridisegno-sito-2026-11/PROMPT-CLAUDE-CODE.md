Incolla questo messaggio in Claude Code, dalla cartella del repository `taglendo`, dopo aver copiato il pacchetto in `design/ridisegno-sito-2026-11/`.

---

Ho messo in `design/ridisegno-sito-2026-11/` il nuovo design di cinque pagine del sito pubblico: home clienti, barbieri vicino a te (elenco e mappa), pagina del salone, home saloni e una nuova pagina «Funzioni» per i saloni.

1. Leggi `design/ridisegno-sito-2026-11/IMPLEMENTAZIONE.md` dall'inizio alla fine, poi guarda le immagini in `riferimenti/` e i prototipi in `prototipi/` (sono file `.dc.html` del canvas: leggili come sorgente, non vanno copiati).
2. Aggiungi in `CLAUDE.md`, sezione «Fonti di verità», che per queste cinque pagine vale `design/ridisegno-sito-2026-11/`.
3. Rispetta i vincoli del §1 (niente "link", niente piani a pagamento, niente prezzi aggregati, nessun salone in vetrina, niente sezioni decorative tipo ticker) e le regole di stile di `CLAUDE.md`.
4. Prima di toccare il codice, proponimi un piano diviso per pagina, nell'ordine: pagina del salone → barbieri vicino a te → home clienti → home saloni → Funzioni. Indica per ognuna i componenti che cambi o crei, i componenti che togli, e le migrazioni e i cambi di backend del §8. Aspetta la mia conferma.
5. Poi lavora una pagina alla volta: implementazione, test (Vitest per le regole, Playwright per il flusso ricerca → pagina del salone → prenotazione), controllo a 1440 px e a 390 px, commit. A fine pagina dimmi cosa manca.
6. Se il design e i documenti in `docs/` sono in conflitto, o una funzione mostrata nella pagina Funzioni non esiste nel gestionale, chiedimi prima di decidere.
