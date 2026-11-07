# Taglendo · come portare il ridisegno nel progetto (Claude Code)

Questo zip è il **nuovo riferimento di design** per le schermate elencate qui sotto. Il registro completo, giro per giro, è in `MODIFICHE.md`. I giri si sovrappongono: per ogni schermata vale l'**ultimo** giro che la nomina. Le home dei giri 9 e 10 e la prenotazione a blocchi del giro 10, per esempio, sono superate.

## 1. Dove mettere i file nel repository
Copia lo zip in `design/ridisegno-2026-11/`, con la stessa struttura: `index.html`, `pages/`, `css/`, `assets/`, `js/`, `MODIFICHE.md` e questo file.

- **Pagine HTML**: sono prototipi da **ricostruire** nei componenti Next.js, non da copiare, come dice già `CLAUDE.md`.
- **`js/prototipo.js`**: serve solo all'anteprima, per rendere cliccabili le pagine statiche. Non va portato nell'app. Le logiche da rifare in React sono descritte in `MODIFICHE.md`.
- **Testi**: i testi nuovi e quelli cambiati sono elencati in `MODIFICHE.md`, giro per giro. Per queste schermate **sostituiscono** i testi di `design/*.dc.html`.

## 2. Token (`tokens/tokens.css`)
Tutti i token nuovi stanno nel blocco `:root` di `css/app.css` (riga 6). Vanno aggiunti a `tokens/tokens.css`. Un solo token esistente è cambiato: `--tabbar-height` passa da `52px` a `0px`, perché su telefono non c'è più la barra in basso.

Per trovarli confronta il blocco `:root` con quello del tuo `tokens.css`. Ecco i gruppi:

| Gruppo | Token |
| --- | --- |
| movimento | `--duration-normal`, `--duration-slow`, `--ease-in-out-strong` |
| spazi e misure | `--space-10`, `--modal-width-booking`, `--cal-day-size`, `--time-chip-min`, `--tab-icon-width`, `--tab-icon-height`, `--mobilebar-height`, `--avatar-large`, `--avatar-xl`, `--flow-width`, `--person-size` |
| ombre | `--shadow-block`, `--shadow-panel-soft`, `--shadow-tabbar`, `--shadow-rail` |
| statistiche | `--chart-l0` … `--chart-l4`, `--chart-height`, `--chart-area` |
| pagina del salone | `--status-open-dot`, `--status-open-glow`, `--map-bg`, `--map-road`, `--map-block`, `--map-park`, `--shop-content`, `--shop-hero-radius`, `--site-h1`, `--backdrop-photo` |
| home | `--home-rule`, `--home-rule-light`, `--land-scrim`, `--land-scrim-phone`, `--land-h1`, `--land-h2`, `--land-max`, `--land-phone-w`, `--land-wordmark`, `--land-hero-h1`, `--land-header-bg` |

## 3. Da quale CSS a quale componente
I nomi delle classi seguono i moduli del progetto: `Modulo-module__hash__classe` diventa `components/…/Modulo.module.css` con la classe `classe`. I blocchi nuovi sono in fondo a `css/app.css`, ognuno con un commento che dice il modulo e il giro.

| Modulo nel CSS | Dove va nel repository | Cosa contiene |
| --- | --- | --- |
| `AppShell` (modifiche) | `components/app/AppShell.module.css` + `AppShell.tsx` | barra laterale desktop crema con la riga sottile; su telefono testata con «Menu» e menu a pannello laterale da destra; niente barra in basso |
| `Day`, `Agenda`, `SidePanel`, `Dialogs` (modifiche) | `components/agenda/*` | orari liberi e occupati più distinguibili, colonna destra semplificata, pulsante calendario |
| `Calendar` (nuovo) | `components/agenda/Calendar.module.css` + `MonthCalendar.tsx` | calendario mensile su 4–6 mesi, nell'agenda e in «Nuovo appuntamento» |
| `Flow` (nuovo) | `components/agenda/Flow.module.css` + `NewAppointment.tsx` | «Nuovo appuntamento» e «Cliente in negozio» come schermata unica (Quando · Cosa · Con chi · Per chi), prezzo con la matita |
| `Avatar` (nuovo) | `components/ui/Avatar.module.css` + `Avatar.tsx` | avatar e foto del cliente, scelta del colore |
| `Clients` (modifiche) | `components/clients/*` | rubrica, scheda cliente, nuovo cliente, foto |
| `Stats` (nuovo) | `components/stats/*` + `app/(app)/statistiche/page.tsx` | statistiche (giorno, settimana, mese, anno), resoconto del giorno; solo per il titolare con più di un operatore |
| `Listino` (modifiche) | `components/listino/*` + `app/(app)/listino/orari/…` | schede Servizi e Orari, orari diversi per ogni giorno |
| `Settings` (nuovo) | `components/settings/Settings.module.css` | Impostazioni, Link, Profilo, Pagina del salone (foto, descrizione, interruttori) |
| `Shop` (nuovo) | `components/salon/Shop.module.css` + `app/(salon)/[slug]/page.tsx` | pagina pubblica del salone, foto, prenotazione a passi, varianti una poltrona, prezzi nascosti e solo telefono |
| `Land` (nuovo) | `components/marketing/Land.module.css` + `app/(marketing)/page.tsx` | home del sito: apertura, «Pronto in 3 passi», confronto, «Cosa cambia», online/telefono, prezzi, domande, banner, piè di pagina |

Al posto di `Marketing`, `Salon` e `Booking` per la home e la pagina del salone ci sono `Land` e `Shop`. Restano in uso:
- da `Marketing`: confronto quaderno/Taglendo, domande frequenti, pagine legali;
- da `Booking`: le schede di codice e conferma;
- da `Salon`: l'avviso cookie.

## 4. Rotte nuove
Le rotte sono quelle usate dai collegamenti delle pagine. La mappa completa è in `js/prototipo.js`, funzione `route`.
- `/statistiche`, con `?periodo=giorno|settimana|anno`
- `/listino/orari` e il dettaglio di un giorno
- `/clienti/nuovo`
- calendario dell'agenda come finestra sopra `/agenda`
- `/impostazioni/pagina`, finora un segnaposto, ora pagina vera

## 5. Lavoro sui dati (Supabase)
Ogni giro in `MODIFICHE.md` ha la voce «Richiede lavoro sul sito». In sintesi:
- **clienti**: foto o colore dell'avatar;
- **appuntamenti**: prezzo cambiato per il singolo cliente, con motivo facoltativo (`price_cents` già copiato, più un campo per lo sconto);
- **orari**: diversi per ogni giorno della settimana, con pause;
- **operatori**: colore in agenda, «prenotabile online», foto e telefono;
- **salone**: foto (massimo 8, con ordine e copertina), descrizione, zona, «prenotazione online» acceso o spento, «mostra i prezzi»;
- **pagina pubblica**:
  - stato aperto/chiuso calcolato dagli orari;
  - prima disponibilità per servizio e barbiere;
  - orari liberi a passi di 30 minuti, o del passo scelto dal salone;
  - prossimo giorno libero;
  - «Prenota con …» che passa il barbiere alla prenotazione;
- **statistiche**: incassi per giorno, settimana, mese e anno, per operatore; clienti migliori; resoconto del giorno;
- **profilo**: dispositivi collegati, abbonamento, metodo di pagamento e ricevute (da Stripe).

## 6. Ordine consigliato
1. Token e guscio dell'app (barra laterale, menu su telefono).
2. Agenda: griglia, lista, colonna destra, calendario mensile.
3. «Nuovo appuntamento» e «Cliente in negozio» (`Flow`), con il prezzo per il cliente.
4. Clienti e avatar.
5. Listino e orari per giorno.
6. Impostazioni, Link, Profilo, Pagina del salone con le foto.
7. Statistiche.
8. Pagina pubblica del salone con la prenotazione a passi e le foto.
9. Home del sito.

Chiudi ogni passo con test verdi e un commit, come chiede `CLAUDE.md`.

## 7. Messaggio da incollare in Claude Code
```
Ho un ridisegno completo in design/ridisegno-2026-11/ (schermate HTML statiche, css/app.css,
MODIFICHE.md e IMPLEMENTAZIONE.md). Per le schermate elencate lì è il nuovo riferimento di design
e i suoi testi sostituiscono quelli di design/*.dc.html.
Leggi prima IMPLEMENTAZIONE.md e MODIFICHE.md (per ogni schermata vale l'ultimo giro che la nomina).
Poi proponimi un piano diviso nei passi della sezione 6, con i file da toccare e le migrazioni
Supabase necessarie, e aspetta la mia conferma prima di scrivere codice.
Regole: token solo in tokens/tokens.css, niente esadecimali nei componenti, ricostruisci i
componenti (non copiare l'HTML), non portare js/prototipo.js, test verdi e commit a fine passo.
```
