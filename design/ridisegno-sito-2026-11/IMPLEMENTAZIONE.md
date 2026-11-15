# Taglendo · ridisegno del sito (novembre 2026) — istruzioni per Claude Code

Questo pacchetto è il **nuovo riferimento di design** per cinque pagine del sito pubblico. Sostituisce, solo per queste pagine, i design precedenti (`design/*.dc.html` e le home di `design/ridisegno-2026-11/`). Tutto il resto del prodotto (gestionale, registrazione, email) non cambia.

| # | Pagina | Rotta nel repo | Prototipo | Riferimento visivo |
|---|---|---|---|---|
| 1 | Home clienti | `app/(site)/(home)/page.tsx` | `prototipi/Main.dc.html` | `riferimenti/01-home-clienti-*.jpg` |
| 2 | Barbieri vicino a te (elenco + mappa) | `app/(site)/(elenco)/cerca/page.tsx` | `prototipi/Cerca.dc.html` (+ `CercaSelezione`, `CercaFiltri`, `CercaZona`, `CercaVuota`) | `riferimenti/02-*.jpg` |
| 3 | Pagina del salone | `app/(salon)/[slug]/page.tsx` | `prototipi/Salone.dc.html` | `riferimenti/03-*.jpg` |
| 4 | Home saloni | `app/(saloni)/per-i-saloni/page.tsx` | `prototipi/Saloni.dc.html` | `riferimenti/04-*.jpg` |
| 5 | Funzioni per i saloni (**nuova**) | `app/(saloni)/per-i-saloni/funzioni/page.tsx` | `prototipi/Funzioni.dc.html` | `riferimenti/05-*.jpg` |

## 0. Come usare questo pacchetto

1. Copia la cartella in `design/ridisegno-sito-2026-11/` e aggiungi una riga in `CLAUDE.md`, sezione «Fonti di verità»: per le cinque pagine sopra vale questa cartella.
2. I file `.dc.html` sono **prototipi del canvas di Claude**: si aprono solo nel canvas (servono `support.js` e il runtime). Leggili come sorgente: markup, stili inline, testi, e la classe `Component` in fondo con lo stato e i comportamenti. **Vanno ricostruiti in componenti Next.js, non copiati.**
3. Le immagini in `riferimenti/` sono rendering statici: dove nel prototipo c'è un dato dinamico (`{{ … }}`) l'immagine può mostrare un vuoto. In quei punti fa fede il codice del prototipo.
4. I valori `/_blob/…` nei prototipi sono le immagini caricate nel canvas. Le trovi in `assets/` (vedi §7). Nell'app vanno usate le foto e i loghi veri dei saloni (Supabase Storage).
5. Lavora una pagina alla volta, nell'ordine 3 → 2 → 1 → 4 → 5 (la pagina del salone è riusata dentro la home saloni). Per ognuna: piano breve, implementazione, test, commit.

## 1. Vincoli decisi con il titolare (non cambiarli)

- **Niente concetto di "link".** Il salone ha la sua **pagina** (servizi, foto, barbieri, orari, prenotazione). Nei testi del sito non si dice "il tuo link".
- **È gratis durante la beta.** Nessun piano a pagamento visibile: niente `PricingPlans`. Il prezzo si comunica con il **contatore che scende da 29 € a 0 €** (come il sito attuale) e la riga «Gratis durante la beta · Senza carta di credito · Zero commissioni».
- **Niente prezzi aggregati** ("da 20 €", prezzi medi per città o per servizio) in home e nelle città: i prezzi variano in Italia. I prezzi compaiono solo dentro il singolo salone e nelle sue schede.
- **Nessun salone in vetrina.** Non c'è un sistema di recensioni, quindi niente "consigliati", "da provare", "i migliori". Gli elenchi sono in ordine **neutro**: distanza (ricerca) o data di arrivo (home, «Appena arrivate su Taglendo»).
- **Niente recensioni o stelle inventate.**
- **Niente sezioni "da AI":** ticker che scorrono, adesivi, card fluttuanti, numeri giganti di statistiche, griglie di 4 icone generiche. Togli `Ticker`, `ModeSwitch` (lo switch clienti/saloni) e la tabella `BeforeAfter` oraria dalla home saloni.
- **Forme:** l'unica forma "di marca" è lo **squircle del logo** (`border-radius: 22%`). Niente archi, cupole o angoli tagliati.
- **Schermate vere:** nella home saloni e in Funzioni si mostrano schermate reali dell'app (o la pagina del salone vera), non schermate disegnate.
- **Testi:** quelli dei prototipi, in italiano. Non riscriverli.

Restano valide tutte le regole di `CLAUDE.md`: token, Manrope 400–700, albicocca solo come accento, contrasto 4,5:1, controlli 48 px, animazioni 150–300 ms con `cubic-bezier(0.23,1,0.32,1)`, `prefers-reduced-motion`.

## 2. Pagina del salone (`/[slug]`)

Componenti da toccare: `components/salon/PublicPage.tsx`, `Shop.module.css`, `Salon.module.css`, `Gallery.tsx`, `ShopBooking.tsx`, `BottomBar.tsx`.

**Barra in alto (sticky, panna):** logo del salone 40 px nello squircle, nome + zona, ancore *Servizi · Foto · Barbieri · Da sapere · Orari e indirizzo*, chip con il telefono.

**Intestazione prugna — deve funzionare senza foto** (molti saloni non le caricano):
- riga sopra: percorso `Taglendo · Barbieri a {città} · {zona}` a sinistra; pulsanti fantasma **Condividi** e **Salva** a destra (su telefono solo icone, percorso nascosto);
- **logo del salone** 128 px nello squircle (`salons.logo_path`); se manca, iniziali del nome su pesca;
- pill di stato «Aperto ora · chiude alle 19:30» (puntino verde) o chiuso;
- H1 nome, descrizione (`salons.description`);
- tre fatti con divisore: indirizzo + "3 min dalla stazione" (testo libero se c'è, altrimenti solo indirizzo), orario di oggi + giorni di chiusura, barbieri con le iniziali sovrapposte + nomi;
- a destra, in colonna: **Prenota online** (panna), **telefono** (contorno), link **Indicazioni** (porta a `#dove`).
- **Non** mettere qui un riquadro con i prossimi posti liberi (scartato).

**Corpo, due colonne (1.5fr / 1fr):** a sinistra Servizi (riga: nome, durata + descrizione, prezzo, pulsante «Prenota» che apre il modulo su quel servizio), Foto (mosaico 2fr/1fr/1fr, ultima cella "Vedi tutte le foto"), **Chi ti taglia** (card per barbiere con «Prenota con …»), **Da sapere** (nuova, vedi §8), Orari e indirizzo (Apri in Mappe, Chiama, tabella orari con oggi in grassetto). A destra il **modulo di prenotazione sticky** (`top: 96px`) a passi: *Cosa · Con chi · Quando · I tuoi dati*, con «Chi è libero prima», «Prima disponibilità», giorni chiusi tratteggiati.
- Attenzione: lo sticky si rompe se un antenato ha `overflow: hidden`. Usa `overflow-x: clip`.

**Telefono:** intestazione in colonna (logo 80 px), pulsanti a tutta larghezza; prima i servizi, poi il modulo; foto in un carosello orizzontale; barbieri compatti; **barra fissa in basso** con nome, stato e «Prenota» (porta al modulo). Lascia spazio in fondo alla pagina per la barra.

## 3. Barbieri vicino a te (`/cerca`)

Componenti: `components/search/SearchPage.tsx`, `Results.tsx`, `SalonMap.tsx`, `SearchBox.tsx`, `Search.module.css`.

**Header semplice** (logo, servizi, «Hai un salone?»). **La ricerca NON sta nell'header**: sta in una fascia pesca sotto, con percorso, H1 «Barbieri a {città}» e il modulo a pillola *Cosa · Dove · Quando · Aggiorna*.

**Barra filtri:**
- pulsante **Filtri** con contatore dei filtri attivi (pallino albicocca), poi un divisore;
- filtri rapidi multi-selezione: *Liberi oggi, Aperto ora, Sera, Barba, Bambini, Nuovi su Taglendo*;
- **Ordina**: *Più vicini* / *Primo orario libero* (riordina davvero).

**Pannello «Tutti i filtri»** (si apre sotto il pulsante, dall'angolo in alto a sinistra, 200 ms; su telefono è un foglio dal basso a tutta larghezza):
- Distanza massima: 2 · 5 · 10 · 20 km (segmentato);
- Quando: Liberi oggi · Aperto ora · Nuovi su Taglendo;
- Fascia oraria: Mattina (prima delle 13) · Pomeriggio (13–18) · Sera (dopo le 18);
- Servizio: Barba · Sfumatura · Rasatura · Bambini;
- in fondo «Azzera tutto» e «Mostra N barberie».

Sopra la lista: «**N barberie** entro X km» e i filtri attivi come etichette rimovibili. **Stato vuoto:** riquadro tratteggiato «Nessuna barberia con questi filtri» + «Azzera i filtri».

**Scheda risultato:** foto (o logo/iniziali), nome, km, stato aperto/chiuso in verde/grigio, indirizzo, etichette servizio + prezzo, orari liberi del giorno (`nextSlots`), «Vedi». Badge solo fattuali («Nuovo», «2 barbieri»). Passando sopra una scheda si evidenzia il suo puntino.

**Mappa (azione per azione — guarda le 4 tavole `Cerca*.dc.html` con la prop `scene`):**
- puntino = pillola con il **primo orario libero** (`17:30`); bordo verde se libero oggi, tratteggiato grigio se da domani («dom 9:00»);
- hover: il puntino mostra anche il nome; selezionato: diventa prugna con nome;
- in basso, alla selezione, **scheda del salone**: foto, nome, stato, km, tre orari prenotabili, «Vedi la pagina», chiudi;
- controlli a destra: **+**, **−**, **torna alla mia posizione**; il pallino «Tu sei qui» pulsa (fermo con reduced-motion);
- «**Cerca in questa zona**» compare solo dopo aver spostato/zoomato la mappa; al clic «Cerco in questa zona…», poi avviso «N barberie in questa zona»;
- legenda in alto a sinistra (libero oggi / libero domani);
- su telefono: lista o mappa, con un pulsante fisso in basso «Mappa / Elenco».
- La mappa reale resta quella già in uso in `SalonMap.tsx` (OpenStreetMap): il prototipo usa una mappa disegnata solo come segnaposto.

## 4. Home clienti (`/`)

Componenti: `app/(site)/(home)/page.tsx`, `components/search/Home.module.css`, `Rail.tsx`, `SearchBox.tsx`.

1. **Hero** (piace così, non cambiarlo): foto a tutta larghezza con velo, header trasparente, H1 «Il tuo barbiere, quando vuoi tu.», sottotitolo, ricerca a pillola *Cosa ti serve? · Dove? · Quando? · Cerca*, tre rassicurazioni con spunta (Nessuna app da scaricare · Solo orari davvero liberi · Paghi in salone, come sempre). Su telefono il titolo non deve finire sotto l'header (padding in alto).
2. **Cosa ti facciamo oggi?** + link «Tutti i servizi»: 4 riquadri foto (Taglio, Barba, Sfumatura, Rasatura) con sottotitolo e freccia in un cerchio panna. **Senza prezzi.**
3. **Appena arrivate su Taglendo** — sottotitolo «In ordine di arrivo. Nessuna barberia paga per stare qui.» — 4 schede (`recentSalons`, ordine per data di arrivo): foto, etichetta «Libero oggi alle …», nome, indirizzo, servizi. Su telefono scorrono di lato.
4. **Fascia prugna** «Prenotare è più semplice che farsi la barba.» con foto a sinistra e 3 passi.
5. **Barbieri per città**: 4 schede colorate (prugna, pesca, bianca, crema) con nome città, numero di barberie e un dato neutro («2 con posti liberi oggi»). **Nessun nome di salone, nessun prezzo.** Pulsante «Vicino a me». Sotto: «Presto anche a» con città tratteggiate e link «Il tuo barbiere non c'è? Digli di Taglendo».
6. **CTA saloni ben visibile**: grande blocco prugna «Porta la tua barberia su Taglendo.», tre spunte, «Prova gratis» + «Come funziona», a destra un telefono **piccolo e tagliato in basso** con l'agenda vera e l'avviso «Nuova prenotazione online».
7. Footer.

## 5. Home saloni (`/per-i-saloni`)

Componenti: `app/(saloni)/per-i-saloni/page.tsx`, `components/marketing/Land.module.css`, `LandEffects.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`. Rimuovi `Ticker`, `ModeSwitch`, `BeforeAfter`, `PricingPlans` da questa pagina.

1. **Header** su foto: Come funziona · La tua pagina · **Funzioni** (nuova pagina) · Quanto costa · Domande · Accedi · Prova gratis.
2. **Hero** (piace, non cambiarlo): kicker «Per barbieri, da 1 a 3 poltrone», **H1 «La tua agenda online, sempre in tasca.»** (seconda riga in albicocca), sottotitolo «I clienti prenotano dalla pagina della tua barberia, a qualsiasi ora. Tu vedi ogni appuntamento sul telefono e sul computer.», CTA, riga beta. A destra il telefono con l'agenda vera e un **avviso che compare e scompare** ogni 3,2 s («Nuova prenotazione online · Gianni Ferraro · 09:30 con Andrea»).
3. **Una giornata qualunque, con Taglendo.** Striscia unica che sfuma da notte (prugna) a giorno (crema) a sera (pesca), 4 momenti: 23:40 · 08:45 · 15:20 · 18:00. Quando entra nello schermo la linea si disegna (900 ms) e i momenti compaiono in sequenza. Su telefono è verticale.
4. **Pronto in tre passi.** Tre colonne con **schermate vere** in un telefono, ogni riquadro con un fondo diverso (pesca, prugna, verde chiaro), il telefono **tagliato in basso** dal riquadro.
5. **La pagina della tua barberia.** (fondo prugna) A sinistra 5 voci numerate (Il tuo logo in alto · Servizi e prezzi · Prenotazione a passi · Foto e barbieri · Da sapere, orari e mappa); a destra una finestra del browser con **la pagina del salone vera** (stesso componente di §2, rimpicciolito con `transform: scale`). Scegliendo una voce l'anteprima scorre a quella parte e la evidenzia con un riquadro albicocca (640 ms, ease-in-out); le voci avanzano da sole ogni 4,2 s finché l'utente non ne tocca una. Sotto: link «Tutte le funzioni». Su telefono: anteprima alla larghezza del telefono, voci come elenco.
6. **Il quaderno, e poi Taglendo.** Confronto trascinabile: sotto l'agenda vera (desktop), sopra un quaderno scritto a mano tagliato con `clip-path: inset(0 X% 0 0)`; maniglia «Trascina», `input range` accessibile.
7. **Quanto costa?** Contatore **29 → 0 €** che parte quando la sezione è visibile (−1 ogni 40 ms; con reduced-motion mostra subito 0), listino a puntini (Agenda per tutte le poltrone · Pagina della barberia · Prenotazioni online · Fino a 3 barbieri: inclusi; Commissioni 0 €; Carta di credito: non serve), «Registra la tua barberia».
8. **Domande frequenti** (5) e CTA finale prugna «Il prossimo cliente può prenotare stasera.».
9. Telefono: barra fissa in basso «Gratis durante la beta · Prova gratis».

## 6. Funzioni per i saloni (`/per-i-saloni/funzioni`, nuova)

Aggiungi la rotta, la voce «Funzioni» negli header dei saloni e la pagina in `app/sitemap.ts`.

1. **Hero:** «Funzioni», H1 «Tutto quello che c'è dentro Taglendo.», sottotitolo; a destra composizione agenda desktop + telefono con la prenotazione (nascosta su telefono).
2. **Barra delle sezioni** sticky sotto l'header (pillole con ancore).
3. Blocchi grandi alternati (testo a sinistra/destra):
   - **Agenda** (fondo crema): elenco funzioni + schermata desktop (su telefono la schermata da telefono);
   - **La tua pagina** (prugna): elenco + anteprima della pagina del salone vera;
   - **Prenotazioni** (pesca): elenco + **pila delle email** che partono da sole (oggetti veri da `lib/copy/emails.ts` e `notify`: «Il tuo codice: 482 913», «Confermato: …», «Nuova prenotazione: …» (a te), «Domani alle 9:30 da …»);
   - **Il tuo team** (verde chiaro): fino a 3 poltrone + tabella «Cosa può fare chi» Titolare/Barbieri con i permessi veri (`barbers_see_all`, `barbers_edit`, `barbers_contacts` = «se lo attivi»; listino/regole e statistiche = solo titolare).
4. **E tutto il resto** = **domande frequenti** (10 domande e risposte sulle impostazioni, testi nel prototipo, valori veri: preavviso 30 min/2 ore/giorno prima, anticipo 2 settimane/1 mese/2 mesi, orari ogni 15/30 min, annullamento 2/24 ore, promemoria 2–48 ore, riepilogo alle 8:00…).
5. **Cosa Taglendo non fa.** Pagamenti online · SMS · Un'app da scaricare · Catene e grandi saloni (titolo barrato in albicocca + spiegazione).
6. CTA finale e footer.

Le voci elencate devono corrispondere a funzioni già presenti nel gestionale (`app/(app)/…`). Se una non esiste, toglila invece di inventarla.

## 7. Asset

| File | Uso |
|---|---|
| `assets/foto/poltrona.jpg` | hero home clienti, riquadro Rasatura |
| `assets/foto/barbiere-sfumatura.jpg` | hero home saloni, Sfumatura, foto d'esempio |
| `assets/foto/barba.jpg` | Barba, fascia "Prenotare è più semplice" |
| `assets/foto/nuca-sfumatura.jpg` | Taglio |
| `assets/logo-esempio-porta-nuova.svg` | **solo per demo/seed**: logo d'esempio di un salone |
| `assets/schermate-app/*.jpg` | schermate vere dell'app (agenda desktop e telefono, primo avvio, prenotazione, pagina salone) per home saloni e Funzioni. Rigenerale dall'app quando cambia la UI |

Logo e simbolo di Taglendo: quelli già nel repo.

## 8. Dati e backend da aggiungere

Prima di scrivere codice proponi le migrazioni e aspetta conferma.

1. **«Da sapere» del salone** (nuovi campi facoltativi su `salons`, modificabili in `/impostazioni/pagina`): `specialties text` (≤120), `payment_methods text[]` (contanti, carta, bancomat…), `products text` (≤80), `kids_until int null`, `step_free_access boolean null`, `access_note text` (es. «3 min dalla stazione», ≤60). La riga «Disdette» si ricava da `cancel_online` / `cancel_limit_min`. Mostra solo le righe compilate; se nessuna, nascondi la sezione.
2. **Filtri della ricerca:** `SearchFilters` oggi ha solo `service` e `date`. Servono anche: `openNow`, `freeToday`, `band` (`mattina|pomeriggio|sera`, su `nextSlots`/`free_slots`), `maxKm` (2|5|10|20), `services[]`, `isNew` (salone creato da ≤30 giorni) e `sort` (`km|first`). Estendi `parseFilters` (parametri URL), l'RPC di ricerca e i test in `lib/search/rules.test.ts`.
3. **Città nella home:** `listedCities()` + conteggio dei saloni con almeno un posto libero oggi (per la riga «N con posti liberi oggi»). Se è costoso, mostra solo il numero di barberie.
4. **«Appena arrivate»:** `recentSalons()` ordinato per data di creazione; niente ordinamenti "di qualità".
5. Logo: usa `logo_path` (già presente) nell'intestazione e nella barra della pagina del salone.

## 9. Telefono (già progettato nei prototipi, da rispettare)

- Testo dei campi a **16 px** (niente zoom di Safari).
- Chip, orari, segmenti e pulsanti alti **48 px**.
- Altezze a schermo con `100dvh` (fallback `100vh`).
- `-webkit-tap-highlight-color: transparent`; hover solo dentro `@media (hover:hover) and (pointer:fine)`.
- Barre fisse in basso con `env(safe-area-inset-bottom)` e spazio in fondo alla pagina.
- Caroselli orizzontali con `scroll-snap`; nessuno scroll orizzontale della pagina (`overflow-x: clip`).
- Sezioni con meno spazio verticale (circa 56–64 px).

## 10. Accettazione

- Le cinque pagine corrispondono ai riferimenti a 1440 px e a 390 px.
- Nessun prezzo aggregato, nessun "consigliato", nessun "link" nei testi del sito.
- La pagina di un salone **senza foto e senza logo** è curata (iniziali nello squircle).
- Filtri e ordinamento della ricerca funzionano da URL (ricaricando la pagina restano), con test.
- Stato vuoto della ricerca e «Cerca in questa zona» funzionanti.
- Contatore 29→0 e animazioni rispettano `prefers-reduced-motion`.
- Contrasto 4,5:1, controlli 48 px, navigazione da tastiera, `aria-*` su interruttori, schede (tab) e pulsanti a sola icona.
- Test Playwright: ricerca con filtri → scheda → pagina del salone → prenotazione.
