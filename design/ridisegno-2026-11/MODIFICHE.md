# Taglendo · modifiche di design: gestionale, sito e pagina del salone (giri 1–17)

> **Come leggere questo file.** I giri sono in ordine: per ogni schermata vale l'**ultimo** giro che la nomina (per esempio, la home dei giri 9–10 e la prenotazione a blocchi del giro 10 sono superate). Come portare tutto nel progetto è spiegato in `IMPLEMENTAZIONE.md`.
> Pulizia finale: tolti da `css/app.css` i blocchi `Site` (giro 9) e `Home` (giro 10) e i token non più usati `--site-section-gap`, `--site-h2`, `--home-max`, `--home-label`, `--home-h1`, `--tape`.


Area toccata: **agenda del gestionale** (griglia desktop, lista telefono, colonna destra, finestra «Nuovo appuntamento») più alcune regole comuni del guscio dell'app (barra in basso, pulsanti) per dare un tono più da app.

Le altre aree (sito, pagina pubblica, clienti, impostazioni) non sono state modificate nella struttura. Ricevono solo gli effetti delle regole comuni descritte in fondo («Guscio dell'app»).

Tutto il CSS nuovo sta in `css/app.css`:
- **Token nuovi o cambiati**: dentro `:root`, in fondo alla lista.
- **Regole nuove**: in un unico blocco in fondo al file, «RIPROGETTAZIONE AGENDA · novembre 2026», diviso per modulo dell'app (`Modal`, `Dialogs`, `Day`, `SidePanel`, `AppShell`). Da lì vanno riportate nei rispettivi `.module.css`.

Nelle pagine non ci sono colori o misure scritti a mano.

---

## nuovo-appuntamento (nuovo-1-vuoto, nuovo-2-cliente, nuovo-3-orario, nuovo-4-tutti-gli-orari, nuovo-5-cliente-nuovo, nuovo-6-dal-buco · -p e -d) · giro 2

- **Cosa è cambiato**: la finestra è un elenco di **quattro righe**: **Quando**, **Cosa**, **Con chi**, **Cliente**.
  - Ogni riga mostra a destra la scelta fatta, per esempio «Sab 7 nov · 09:00» o «Taglio uomo · 30 min · 20 €». Se manca, compare un invito in grigio: «Scegli giorno e ora», «Scegli il cliente».
  - **Si apre una riga alla volta.** Fatta la scelta, la riga si chiude e si apre la prossima che manca. Cosa e Con chi hanno già un valore di partenza, quindi di solito si passa da Quando direttamente a Cliente.
  - **Quando**:
    - pulsante calendario e striscia di 14 giorni, con i giorni di chiusura tratteggiati e disattivati;
    - sotto, gli orari divisi in **Mattina** e **Pomeriggio**, con i barrati occupati;
    - il calendario apre la vista del mese, descritta nella sezione del calendario più sotto. Se scegli un giorno fuori dalla striscia, il pulsante calendario resta acceso e mostra la data, per esempio «16 mar».
  - **Cosa**: elenco dei servizi, con durata e prezzo a destra.
  - **Con chi**: Chiunque · il primo libero, Andrea, Marco o Simone, su due colonne.
  - **Cliente**: ricerca, clienti salvati, «+ Nuovo cliente». Per un cliente nuovo compaiono Nome, Telefono e «Cambia cliente».
  - In fondo: «Annulla» e «Fissa l'appuntamento». Il secondo si attiva quando ci sono orario e cliente.
  - Finestra desktop larga 560 px. Su telefono è il foglio dal basso, con lo stesso contenuto.
- **Perché**: la versione del giro 1 mostrava tutto insieme ed era confusa. Ora si vede un riepilogo di quattro righe e un solo gruppo di scelte alla volta. Il riepilogo delle scelte e la finestra sono la stessa cosa.
- **Azioni aggiunte / tolte / spostate**:
  - *Aggiunte*: il **pulsante calendario** dentro «Quando», al posto del campo data «Altro giorno».
  - *Tolte*:
    - il riepilogo testuale in fondo (`recap`), ora ripetuto dalle quattro righe;
    - i 4 orari suggeriti (`slotBig`);
    - i link «Altro orario o giorno» e «Mostra solo i primi orari»;
    - il riquadro «Cambia orario» (`picked`);
    - il campo data nativo «Altro giorno», sostituito dal calendario.
  - *Restano*: ricerca e scelta cliente, nuovo cliente (Nome, Telefono), «Cambia cliente», giorni, orari, servizi, barbieri, «Annulla», «Fissa l'appuntamento».
- **Testi nuovi o cambiati**:
  - i titoli «Quando», «Cosa», «Con chi» e «Cliente»;
  - i segnaposto «Scegli giorno e ora» e «Scegli il cliente»;
  - i gruppi «Mattina» e «Pomeriggio»;
  - il suggerimento ora dice «Orari con Chiunque · Sab 7 nov · Barrato = occupato», con la data.
- **Nuovi token o valori nel CSS**:
  - `--modal-width-booking: 560px`, `--time-chip-min: 60px`, `--cal-day-size: 44px`;
  - classi nuove in `Dialogs`: `bookModal`, `steps`, `step`, `stepOpen`, `stepHead`, `stepLabel`, `stepValue`, `stepValueEmpty`, `stepChevron`, `stepBody`, `whenDays`, `whenCal`, `whenTimes`, `calButton`, `calButtonOn`, `calButtonDate`, `timeGroup`, `timeGroupTitle`, `options`, `optionsGrid`, `option`, `optionOn`, `optionMain`, `optionSub`, `optionNew`, `clientSearch`, `clientNew`.
  - Le classi `q…` del giro 1 sono state tolte dal CSS.
- **Cosa mostra ciascuno stato**:

| File | Stato |
|---|---|
| nuovo-1-vuoto | Quando aperto, niente scelto. Fissa disattivato. |
| nuovo-2-cliente | cliente già scelto (Alessio Ricci), Quando aperto. |
| nuovo-3-orario | tutto scelto, tutte le righe chiuse: si vede il riepilogo. Fissa attivo. |
| nuovo-4-tutti-gli-orari | **«altro giorno»**: calendario aperto dentro Quando, su marzo 2027, con il 16 scelto. |
| nuovo-5-cliente-nuovo | Cliente aperto con Nome e Telefono del cliente nuovo. |
| nuovo-6-dal-buco | aperto da un posto libero: Quando (Sab 7 nov · 09:00) e Con chi (Andrea) già riempiti, Cliente aperto. |

- **Comportamento da implementare** (richiede lavoro sul sito; il prototipo in `js/prototipo.js` lo mostra già):
  - **Una sola riga aperta.** Toccare l'intestazione di una riga la apre o la chiude.
  - **Dopo una scelta** si apre la prossima riga che manca: prima Quando, poi Cliente.
  - **Cambiando giorno, servizio o barbiere** gli orari si ricalcolano. Se l'orario scelto non è più libero, va tolto.
  - **Aperta da un posto libero dell'agenda** o da «Primi posti liberi»: giorno, ora e barbiere arrivano già scelti.

## Calendario mensile (nuovo) · agenda-calendario-p/-d e dentro «Nuovo appuntamento»

- **Cosa è**: un calendario del mese nello stile Taglendo, per vedere o fissare appuntamenti anche a 4–5 mesi.
  - In alto c'è il mese, con le frecce per il mese precedente e il successivo.
  - Sotto c'è una fila di **scorciatoie per i prossimi 7 mesi** (Nov · Dic · Gen 27 · Feb · Mar · Apr · Mag), per saltare subito a un mese lontano.
  - La griglia dei giorni usa gli stessi riquadri della striscia dell'agenda:
    - oggi ha il bordo prugna, il giorno scelto è prugna pieno;
    - i giorni di chiusura sono tratteggiati;
    - un puntino albicocca indica i giorni che hanno già appuntamenti.
  - Sotto la griglia ci sono la legenda e il pulsante «Oggi».
- **Dove compare**:
  1. **Agenda**: nuovo pulsante **«Calendario»** (icona più scritta) prima della striscia dei giorni, in tutte le pagine dell'agenda.
     - Su desktop apre un pannello sotto il pulsante.
     - Su telefono apre un foglio dal basso.
     - In fondo ci sono «Chiudi» e «Apri martedì 16 marzo», che porta l'agenda a quel giorno.
     - Qui i giorni di chiusura sono cliccabili, perché si vuole poter vedere la giornata chiusa.
  2. **Nuovo appuntamento → Quando**: il pulsante calendario sostituisce la striscia degli orari con il mese.
     - Scelto un giorno, tornano gli orari di quel giorno.
     - Qui i giorni chiusi e quelli passati sono disattivati, e non si torna prima del mese corrente.
- **Schermate nuove**: `agenda-calendario-p.html` e `agenda-calendario-d.html` (agenda di oggi con il calendario aperto su marzo 2027).
- **Testi nuovi**:
  - «Calendario», «Vai a un giorno», «Apri martedì 16 marzo»;
  - «Mese precedente» e «Mese successivo» (etichette per i lettori di schermo);
  - la legenda «con appuntamenti» e «chiuso», e il pulsante «Oggi».
- **Nuovi token o valori nel CSS**:
  - nuovo modulo `Calendar-module__tgK7cA__*`: `cal`, `head`, `month`, `nav`, `months`, `monthChip`, `monthChipOn`, `grid`, `dow`, `blank`, `day`, `num`, `dot`, `dayToday`, `dayClosed`, `dayPast`, `dayOn`, `foot`, `legend`, `closedMark`, `today`, `popover`, `popTitle`, `popFoot`, `sheet`;
  - in `Agenda`: `dateRow`, `calButton`, `calButtonText`, `calButtonOn`.
- **Richiede lavoro sul sito**:
  - il conteggio dei giorni con appuntamenti per mese, per i puntini;
  - un parametro per il limite di prenotazione nel futuro (qui 7 mesi).

## agenda-oggi, agenda-giorno, agenda-ore-passate, agenda-barbiere, barbiere-agenda, agenda-chiuso, agenda-offline, appuntamento-*, cliente-in-negozio (-p e -d): griglia e lista

- **Cosa è cambiato**:
  - **Desktop**:
    - **Occupato = blocco pieno, libero = spazio vuoto.** I posti liberi non sono più riquadri verdi tratteggiati con testo. A riposo mostrano solo «30 min libere» in grigio.
    - Al passaggio del mouse, o con la tastiera, il posto libero si colora di verde e mostra «+ Fissa» e la fascia oraria.
    - Su schermi touch senza mouse «+ Fissa» resta sempre visibile in verde.
    - Gli appuntamenti hanno una leggera ombra, per «stare sopra» la griglia.
    - La griglia perde il bordo e diventa un pannello con ombra morbida e angoli più ampi.
  - **Telefono**:
    - Gli appuntamenti sono schede bianche.
    - I posti liberi sono righe più basse, tratteggiate in verde e staccate dalle schede, con «+» davanti: «+ Libero 30 min · Andrea 09:30–10:00».
    - Le schede si arrotondano dove un posto libero le interrompe.
  - **Appuntamento in corso** (`blockNow`): prima era testo prugna su albicocca, che va contro la regola «mai testo su albicocca». Ora è prugna come gli altri, con una barra albicocca a sinistra.
- **Perché**: prima liberi e occupati avevano lo stesso peso visivo, perché entrambi erano riquadri pieni con testo. Ora l'occhio legge subito dove c'è gente e dove c'è spazio.
- **Azioni aggiunte / tolte / spostate**: nessuna. Ogni posto libero resta un pulsante con la stessa `aria-label` («Fissa con Andrea 09:30–10:00»).
- **Testi cambiati**: nessuno. Il «+» davanti alle righe libere su telefono è aggiunto dal CSS.
- **Nuovi token o valori nel CSS**: `--shadow-block`, `--shadow-panel-soft`.

## colonna destra dell'agenda (desktop, stesse pagine sopra)

- **Cosa è cambiato**:
  - **«Adesso in salone · 09:21»** mostra solo chi è in poltrona, con «Completato / Non è venuto», oppure «Nessuno in poltrona.».
    - Prima, sotto «Nessuno in poltrona.», comparivano i prossimi 5 appuntamenti. Sembrava che fossero in salone.
  - **«Prossimi»**: nuova sezione, con al massimo **3** appuntamenti.
  - **Nei giorni diversi da oggi**, «Primi appuntamenti» mostra al massimo **3** appuntamenti.
  - **«Primi posti liberi»**:
    - via il riquadro verde pieno;
    - ogni posto è una riga tratteggiata verde, coerente con la griglia;
    - «+ Fissa» è una pillola verde.
  - **«Oggi / Giornata in numeri»**: un'unica scheda con tre colonne separate da linee, invece di tre riquadri.
  - **Titoli delle sezioni**: non più in maiuscoletto spaziato, ma frase normale in grassetto.
  - **Pannello**: senza la linea di separazione a sinistra.
- **Perché**: la colonna ripeteva la griglia (5 appuntamenti) e mischiava «adesso» e «dopo». Ora risponde a quattro domande: *chi c'è adesso*, *chi arriva*, *dove posso infilare qualcuno*, *come va la giornata*.
- **Azioni aggiunte / tolte / spostate**: il 4° e il 5° appuntamento non sono più pulsanti nella colonna, ma restano cliccabili nella griglia. Le altre azioni restano tutte.
- **Testi cambiati**: aggiunto il titolo **«Prossimi»** per la nuova sezione.
- **Nuovi token o valori nel CSS**: classe `SidePanel-module__Xpr6Pq__now` sulla sezione «Adesso in salone».

## Guscio dell'app (tutte le 83 pagine del gestionale)

- **Cosa è cambiato**:
  - **Barra in basso su telefono**:
    - ogni voce ha un'icona: le stesse della barra laterale, più una griglia 2×2 per «Altro»;
    - la voce attiva ha una pillola pesca dietro l'icona, al posto della lineetta albicocca;
    - la barra è più alta (64 px) e ha un'ombra leggera invece della linea.
  - **Pulsanti dentro il gestionale**: arrotondati a pillola (`[data-app-shell] .Button…`). Sito e pagina pubblica non cambiano.
  - **Giorni nella striscia dell'agenda**: angoli più morbidi, senza bordo marcato. Su desktop il filtro barbieri è a pillola.
  - **Barra laterale desktop**: senza linea di separazione.
- **Perché**: è la richiesta «più app, meno software». Icone in basso, forme morbide, ombre al posto delle linee e meno etichette in maiuscolo.
- **Azioni aggiunte / tolte / spostate**: nessuna. La lineetta `tabBar` resta nel markup ma è nascosta: si può togliere dal componente.
- **Testi cambiati**: nessuno.
- **Nuovi token o valori nel CSS**:
  - `--tabbar-height` cambia da 52 a 64 px;
  - nuovi `--tab-icon-width`, `--tab-icon-height`, `--shadow-tabbar`;
  - nuova classe `AppShell-module__ygtovq__tabIcon`.

## Giro 3 · finestre appuntamento, Cliente in negozio, area clienti, foto e avatar

### nuovo-1…6 e cliente-in-negozio (-p e -d): stessa impostazione grafica

- **Cosa è cambiato**:
  - **Righe più leggere.** Le righe chiuse sono schede bianche con un'ombra morbida, senza bordo. Quella aperta ha un contorno prugna.
  - **Intestazione delle righe.** A sinistra c'è un'icona tonda per ogni domanda: orologio, forbici, persona, scheda cliente. L'etichetta piccola sta sopra e il valore sotto, in grassetto.
  - **Colore dell'icona tonda**:
    - grigia se manca la scelta;
    - pesca quando la scelta è fatta;
    - prugna mentre la riga è aperta.
  - **Avatar al posto dell'icona.** Scelti il barbiere o il cliente, l'icona diventa il suo avatar.
  - **Orari** su fondo sabbia senza bordo. Gli occupati hanno un tratteggio leggero.
  - **Pulsanti in fondo**: «Fissa l'appuntamento» è largo il doppio di «Annulla».
- **«Cliente in negozio»** usa ora la stessa finestra a righe.
  - La riga **Quando** è fissa: «Adesso · 09:23», con l'etichetta verde «Adesso», e non si apre.
  - All'apertura è aperta la riga **Cliente**.
  - Prima la finestra era l'elenco Cliente → Servizio → Barbiere, con il riepilogo in fondo.
- **Azioni aggiunte / tolte / spostate**:
  - in «Cliente in negozio» è stato tolto il riepilogo testuale «Scegli il cliente · Taglio uomo · adesso», ora ripetuto dalle righe;
  - per il resto, stesse azioni di «Nuovo appuntamento».
- **Testi nuovi**: l'etichetta «Adesso» e il titolo «Recenti» sopra i clienti salvati. La ricerca usa come segnaposto il testo dell'etichetta «Cerca tra i clienti salvati», che resta per i lettori di schermo.
- **Classi nuove in `Dialogs`**: `stepIcon`, `stepText`, `stepAvatar`, `stepDone`, `stepStatic`, `stepBadge`, `srOnly`, `searchBox`, `searchIcon`, `clientOption`, `optionStack`, `newIcon`.

### Scelta e creazione del cliente dentro le finestre

- **Ricerca e clienti salvati**:
  - la ricerca ha la lente;
  - i clienti salvati sono righe con avatar colorato, nome e telefono;
  - «Nuovo cliente» è una riga tratteggiata con il segno +.
- **Nuovo cliente**:
  - in alto c'è un'anteprima grande dell'avatar, con «Aggiungi foto» e 5 colori per le iniziali (Pesca, Prugna, Salvia, Sabbia, Lavanda);
  - sotto ci sono Nome e Telefono;
  - l'avatar si aggiorna mentre scrivi il nome.

### clienti, clienti-ricerca, clienti-ricerca-vuota, clienti-da-richiamare (-p e -d)

- **Cosa è cambiato**:
  - **Avatar colorati**: ogni cliente ha un colore fisso, ricavato dal nome. Lo stesso colore compare in agenda, nella scheda e nelle finestre.
  - **Ricerca** con la lente.
  - **Lettere dell'indice** che restano in alto mentre scorri.
  - **Schede dell'elenco** con ombra morbida invece del bordo. Il pulsante WhatsApp è verde.
  - **Su telefono** la data del prossimo appuntamento va sotto il nome, così il nome non viene più tagliato.
- **Azioni aggiunte / tolte / spostate**: «+ Nuovo» non porta più all'agenda (`/agenda?nuovo=nuovo`): apre la finestra **Nuovo cliente**. Da lì «Salva e fissa un appuntamento» mantiene il vecchio percorso.
- **Testi cambiati**: nessuno.

### cliente-scheda, barbiere-scheda-cliente, cliente-elimina (-p e -d)

- **Cosa è cambiato**:
  - **Intestazione centrata**, con l'avatar grande (88 px) nel colore del cliente.
  - **Pulsante con la fotocamera** sull'avatar: apre la finestra «Foto di Alessio». Nella vista del barbiere (`barbiere-scheda-cliente`) non c'è, perché il barbiere non modifica i clienti.
  - **Tre azioni rapide** sotto il nome: **WhatsApp**, **Chiama**, **Appuntamento**.
  - **Statistiche e schede** con ombra morbida.
- **Azioni aggiunte / tolte / spostate**:
  - *Spostati*: WhatsApp e Chiama passano dalla barra in alto alle azioni rapide.
  - *Aggiunti*: «Appuntamento», che apre «Nuovo appuntamento» con il cliente già scelto, e «Cambia foto o colore».
- **Testi nuovi**: «Appuntamento» e l'etichetta per i lettori di schermo «Cambia foto o colore di Alessio Ricci».

### Classi e token nuovi

- **Modulo nuovo `Avatar-module__tgAv01__*`**: `avatar`, `sm`, `md`, `lg`, `xl`, `c0`…`c4`, `photo`, `picker`, `pickerSide`, `photoButton`, `fileInput`, `swatches`, `swatch`, `swatchOn`.
- **Classi nuove in `Clients`**: `searchBox`, `searchIcon`, `personCentered`, `personText`, `avatarWrap`, `photoBadge`, `quick`, `quickItem`, `quickIcon`, `sheetAuto`, `photoForm`, `photoActions`, `photoAction`.
- **Token nuovi**: `--avatar-large: 88px`, `--avatar-xl: 120px`.
- **Colori degli avatar**: solo token già esistenti.

| Colore | Fondo | Testo |
|---|---|---|
| Pesca | pesca | prugna |
| Prugna | prugna | panna |
| Salvia | `--status-success-bg` | `--status-success-text` |
| Sabbia | `--surface-skeleton` | prugna |
| Lavanda | `--badge-completed-bg` | `--badge-completed-fg` |

### Schermate nuove del giro 3

- **`cliente-nuovo-p/-d`**: finestra «Nuovo cliente», aperta da «+ Nuovo» nella rubrica. Contiene:
  - avatar con «Aggiungi foto» e i 5 colori;
  - una nota: «Foto e colore servono a riconoscerlo al volo in agenda. La foto la vedete solo tu e il tuo staff.»;
  - Nome, Telefono e «Preferenze e note private · facoltativo»;
  - il link «Salva e fissa un appuntamento».

  In fondo ci sono «Annulla» e «Salva cliente». Se il nome è vuoto, «Salva cliente» lo segnala e non salva.
- **`cliente-foto-p/-d`**: finestra «Foto di Alessio», aperta dal pulsante con la fotocamera nella scheda. Contiene:
  - l'anteprima grande;
  - «Scatta una foto», che su telefono apre la fotocamera;
  - «Scegli dalla galleria»;
  - «Oppure usa le iniziali, con un colore», con i 5 colori;
  - una nota sul consenso: «Chiedi prima il permesso ad Alessio: la foto resta nel gestionale e non compare nella pagina pubblica.».

  In fondo ci sono «Annulla» e «Salva». Salvando, l'avatar della scheda si aggiorna.

### Richiede lavoro sul sito

- **Dati del cliente**: servono due campi nuovi, `colore_avatar` (0–4) e `foto`, con un file su Supabase Storage in un bucket privato e una politica che lo renda leggibile solo al salone.
- **Ridimensionamento della foto**: va ridimensionata lato client, per esempio a 256 px, prima del caricamento.
- **Privacy (GDPR)**: la foto è un dato personale.
  - Va raccolto il consenso del cliente. La nota nella finestra lo ricorda.
  - Va inclusa nell'esportazione dei dati («Esporta i dati di …»).
  - Va cancellata insieme al cliente.
- **Dove compare l'avatar**: nelle righe di agenda, colonna destra e clienti va usato lo stesso componente `Avatar`, con la foto se c'è e altrimenti le iniziali nel colore scelto.

## Giro 4 · appuntamento come schermata, Statistiche, Listino e orari

### nuovo-1…6 e cliente-in-negozio (-p e -d): niente più finestra e niente righe che si aprono

- **Cosa è cambiato**: «Nuovo appuntamento» e «Cliente in negozio» non sono più una finestra con righe che si aprono e si chiudono.
  - **Telefono**: diventano una **schermata a tutto schermo** che entra dal basso. In alto c'è la barra con «Annulla» a sinistra e il titolo al centro.
  - **Desktop**: diventano un **pannello laterale a destra**, largo 520 px, con il pulsante di chiusura. L'agenda resta visibile a sinistra.
- **Contenuto**: quattro blocchi numerati, uno sotto l'altro e sempre aperti.
  1. **Quando**: pulsante calendario, striscia dei giorni e orari divisi in Mattina e Pomeriggio. Su telefono gli orari sono una riga che scorre di lato, su desktop una griglia.
  2. **Cosa**: schede dei servizi che scorrono di lato.
  3. **Con chi**: avatar tondi grandi (Chiunque, Andrea, Marco, Simone). Quello scelto ha l'anello prugna e la spunta.
  4. **Per chi**: ricerca più una fila di avatar dei clienti, con «Nuovo» per primo. Scegliendo «Nuovo» compare sotto la scheda con foto o colore, Nome e Telefono.
- **In fondo**: una barra fissa con il riepilogo dal vivo (per esempio «Sab 7 nov · 10:30 · Davide Ferri», e sotto «Taglio e barba · 50 min · 30 € · con Marco») e «Fissa l'appuntamento».
  - Scelto l'orario, la schermata scorre da sola al blocco del cliente.
  - Aperta da un posto libero, giorno, ora e barbiere arrivano già scelti e si parte dal cliente.
- **Perché**: è lo schema delle app di prenotazione: scelte a colpo d'occhio, righe da scorrere col pollice, riepilogo sempre visibile e un solo pulsante.
  - Le righe a fisarmonica del giro 2–3 nascondevano le scelte.
  - La finestra centrale copriva l'agenda.
- **Azioni aggiunte / tolte / spostate**:
  - *Spostate*: «Annulla» passa dal fondo alla barra in alto. Su desktop c'è la X «Chiudi».
  - *Tolte*: le intestazioni apribili delle righe (`stepHead`).
  - Le scelte disponibili restano tutte.
- **Testi nuovi o cambiati**:
  - il blocco del cliente si chiama «Per chi», perché è più naturale in una schermata. Prima era «Cliente».
  - «Nuovo cliente» nella fila di avatar diventa «Nuovo», con «cliente» sotto;
  - su desktop c'è l'etichetta per i lettori di schermo «Chiudi»;
  - in «Cliente in negozio», sotto la data, c'è «Inizia subito, alle 09:23».
- **Nuovi token o valori nel CSS**:
  - `--flow-width: 520px`, `--person-size: 56px`;
  - nuovo modulo `Flow-module__tgFl01__*`: `flow`, `bar`, `barCancel`, `barClose`, `title`, `scroll`, `block`, `blockHead`, `num`, `blockTitle`, `cards`, `card`, `cardOn`, `cardName`, `cardSub`, `people`, `person`, `personOn`, `personAv`, `personName`, `personSub`, `avBig`, `anyAv`, `newAv`, `newClient`, `now`, `nowText`, `footer`, `summary`, `sumMain`, `sumSub`, `confirm`.
  - Le classi `step…` del giro 2–3 restano nel CSS ma non sono più usate da queste schermate. Si possono togliere quando si porta il design nell'app.
- **Da implementare**: nell'app è una rotta o un pannello, non un `<dialog>` modale.
  - Su telefono va aperto come pagina, con il tasto indietro che chiude.
  - Su desktop va aperto come pannello sopra l'agenda, chiuso con Esc o con un clic fuori.

### Statistiche (nuova sezione) · statistiche, statistiche-settimana, statistiche-anno (-p e -d)

- **Dove si apre**: nuova voce **Statistiche** nel menu.
  - Su desktop è un'icona a barre nella barra laterale, dopo Listino.
  - Su telefono è una quinta scheda nella barra in basso, fra Clienti e Link.
- **In alto**: il selettore **Settimana · Mese · Anno** e il periodo con le frecce, per esempio «‹ Ottobre 2026 ›».
- **Contenuto**:
  - **Incasso** del periodo, in grande su fondo prugna, con la variazione sul periodo prima: verde se sale, rosso se scende.
  - **Sei numeri**: Appuntamenti, Scontrino medio, Poltrone occupate, Clienti nuovi, Non presentati (con la percentuale), Clienti che tornano (entro 6 settimane).
  - **Incassi giorno per giorno**, o mese per mese nella vista Anno:
    - barre prugna, con il giorno migliore in albicocca e una linea tratteggiata per la media;
    - passando sopra o con la tastiera compare il valore di ogni barra;
    - i giorni chiusi sono barre vuote.
  - **Per operatore**: incasso, barra, numero di appuntamenti, occupazione e quota sul totale.
  - **Top clienti**: i primi 5 per spesa, con avatar e numero di visite.
  - **Servizi più richiesti**: la quota sul totale degli appuntamenti.
  - **Quando lavori di più**: mappa di calore giorno × ora, in 5 tonalità di prugna, con la pausa tratteggiata e una frase di consiglio.
  - **Da richiamare**: clienti abituali che non tornano da più di 6 settimane, con il pulsante WhatsApp e il link a Clienti.
- **Impaginazione**:
  - **Telefono**: una colonna, con i numeri in griglia da 2.
  - **Desktop**: due colonne. A sinistra incasso, numeri, grafico e mappa. A destra operatori, top clienti, servizi e clienti da richiamare.
- **Perché**: oltre a quello che hai chiesto (guadagni per periodo, per operatore, top clienti) ho aggiunto quello che aiuta a decidere:
  - scontrino medio e clienti che tornano, per capire se il salone cresce;
  - non presentati;
  - fasce più piene, per decidere orari e poltrone;
  - clienti da richiamare, per non perdere chi non torna.
- **Dati d'esempio**: ottobre 2026, la settimana dal 27 ottobre al 2 novembre e l'anno 2026. Le cifre sono inventate ma coerenti fra loro: la somma degli operatori dà il totale.
- **Testi**: sono tutti nuovi e vanno rivisti. La nota in fondo spiega che contano solo gli appuntamenti completati.
- **Nuovi token e classi**:
  - `--chart-l0` … `--chart-l4`: scala prugna per mappa e tracce;
  - `--chart-height: 200px`, che diventa 240 px da 1024 px in su;
  - nuovo modulo `Stats-module__tgSt01__*`.
  - I grafici sono in HTML e CSS. L'altezza delle barre arriva dal dato come `--v`: è un valore di dati, non una misura di stile.
- **Richiede lavoro sul sito**:
  - le viste aggregate su Supabase: incasso per giorno, mese e operatore, occupazione per fascia oraria, clienti che tornano e clienti da richiamare;
  - i permessi: il titolare vede tutto, ogni operatore vede solo le sue cifre o nessuna (da decidere);
  - le frecce del periodo e i link dei top clienti.

### listino, listino-modifica-servizio, listino-nuovo-servizio (-p e -d): scheda Servizi

- **Cosa è cambiato**:
  - in alto, sotto il titolo, due schede: **Servizi** e **Orari**;
  - ogni servizio è una scheda toccabile, con icona, nome, durata con l'orologio, prezzo in grande e freccia;
  - su desktop i servizi stanno in due colonne;
  - «+ Aggiungi servizio» e la nota sul listino restano.
- **Azioni spostate**: i giorni di apertura, gli orari e la pausa pranzo passano tutti nella scheda **Orari**. Lì passano anche le righe «Ferie e chiusure» e «Operatori».
- **Testi cambiati**:
  - l'etichetta «Modifica» non è più scritta: è l'intera scheda a essere toccabile, e l'etichetta per i lettori di schermo «Modifica: Taglio uomo» resta;
  - i titoli delle sezioni non sono più in maiuscoletto.

### listino-orari (nuova) e listino-orari-giorno (nuova): orari diversi per ogni giorno

- **listino-orari**:
  - in alto, un riepilogo prugna: «Aperto 5 giorni · 43 h a settimana · Oggi, venerdì: 9:00–13:00 · 14:30–19:00»;
  - poi la **settimana**, con una riga per giorno: nome, fasce orarie come etichette (per esempio «9:00–13:00» e «14:30–20:00»), freccia e interruttore aperto/chiuso;
  - i giorni chiusi dicono «Chiuso» e sono più tenui;
  - in fondo, le righe «Ferie e chiusure», «Orari dei singoli operatori» (nuova) e «Operatori».
- **listino-orari-giorno**: si apre toccando un giorno. È un foglio su telefono e una finestra su desktop. Contiene:
  - l'interruttore «Aperto il giovedì»;
  - le **fasce orarie** numerate, ognuna con «Dalle» e «Alle», i pulsanti − e + a passi di 15 minuti e il pulsante per toglierla;
  - «+ Aggiungi una fascia»;
  - «Usa questi orari anche per», con le etichette degli altri giorni;
  - in fondo «Annulla» e «Salva».
- **Perché**: prima c'era un solo orario per tutti i giorni aperti, con una sola pausa. Ora ogni giorno ha i suoi orari e quante fasce vuoi, per esempio giovedì aperto fino alle 20 o sabato dalle 8:30. La pausa pranzo è semplicemente lo spazio fra due fasce.
- **Azioni tolte**: i 7 pulsanti dei giorni, i 4 regolatori Apre / Chiude / Pausa dalle / Pausa fino alle e la scelta «Pausa pranzo: Sì / No». Le stesse cose si fanno dalla settimana e dal foglio del giorno.
- **Testi nuovi**:
  - «Servizi», «Orari», «Orari della settimana», «tocca un giorno per cambiarlo»;
  - «Aperto il …», «Spento, il giorno risulta chiuso», «Fasce orarie», «+ Aggiungi una fascia»;
  - «Fra una fascia e l'altra il salone risulta in pausa: nessuno può prenotare.», «Usa questi orari anche per»;
  - «Orari dei singoli operatori» con «Se qualcuno lavora meno giorni o meno ore»;
  - «Giorni o periodi in cui il salone è chiuso» sotto «Ferie e chiusure».
- **Classi nuove in `Listino`**: `tabs`, `tab`, `tabOn`, `services`, `serviceCard`, `serviceIcon`, `serviceText`, `serviceName`, `serviceDur`, `servicePrice`, `chev`, `summary`, `summaryIcon`, `summaryMain`, `summarySub`, `week`, `dayRow`, `dayRowClosed`, `dayMain`, `dayName`, `ranges`, `range`, `rangeClosed`, `daySwitch`, `slots`, `slot`, `slotNum`, `slotTimes`, `slotField`, `slotLabel`, `slotRemove`, `addSlot`, `copyDays`, `copyDay`, `openToggle`.
- **Richiede lavoro sul sito**:
  - una tabella degli orari per giorno della settimana, con più fasce per giorno, al posto di apertura, chiusura e pausa unici;
  - il calcolo dei posti liberi, nell'agenda e nella prenotazione pubblica, da quelle fasce;
  - gli «orari dei singoli operatori», da progettare a parte.

### Menu (tutte le pagine del gestionale)

- Aggiunta la voce **Statistiche**: nella barra laterale dopo Listino, e nella barra in basso fra Clienti e Link.
- La barra in basso passa da 4 a 5 voci.

## Giro 5 · menu su telefono, schermata appuntamento più compatta, statistiche semplici, Impostazioni, Link, prezzo per il cliente

### Menu su telefono (tutte le 99 pagine del gestionale)

- **Cosa è cambiato**:
  - **Niente più barra in basso.** Su telefono c'è una **barra in alto**, fissa mentre scorri, con il logo (porta all'agenda), il nome della sezione e il pulsante **«Menu»**.
  - **Il «Menu»** apre un **foglio dal basso**:
    - le sezioni come riquadri con icona: Agenda, Clienti, Statistiche, Listino e orari, Link, Impostazioni;
    - sotto, il profilo («Andrea · Titolare · il tuo profilo»), «Copia il link di prenotazione» ed «Esci».
  - Si chiude con un tocco fuori o con Esc.
  - Su desktop resta la barra laterale.
- **Perché**: con 5 voci la barra in basso era piena. Il menu in alto libera spazio in fondo, dove ora stanno solo i pulsanti dell'agenda («In negozio ora» e «+ Appuntamento»), e lascia spazio a sezioni future.
- **Azioni spostate**:
  - le voci della barra in basso passano nel foglio «Menu»;
  - «Oggi», nell'agenda di un altro giorno, passa nella barra in alto;
  - la vecchia testata dell'agenda su telefono (logo, nome del salone, avatar) è nascosta: logo e menu sono ora nella barra in alto, e il profilo nel menu.
- **Testi nuovi**: «Menu», «il tuo profilo», «Esci» e l'etichetta per i lettori di schermo «Taglendo, vai all'agenda».
- **Statistiche solo per il titolare**: nelle pagine del barbiere (`barbiere-*`) la voce è tolta sia dalla barra laterale sia dal menu.
- **Classi nuove in `AppShell`**: `mobileBar`, `mbBrand`, `mbTitle`, `mbActions`, `mbToday`, `mbMenu`, `menu`, `menuHandle`, `menuTitle`, `menuGrid`, `menuItem`, `menuItemOn`, `menuIcon`, `menuList`, `menuRow`, `menuRowIcon`, `menuRowText`, `menuRowSub`, `menuLogout`.
- **Token**: `--tabbar-height` passa a 0 e nasce `--mobilebar-height: 56px`.
- **Schermata nuova**: `menu-p` (solo telefono), con il menu aperto sopra l'agenda.

### Nuovo appuntamento su telefono: più compatto

- Tutto più piccolo, con aree di tocco di almeno 44 px:
  - giorni 46 × 54 px;
  - orari alti 44 px;
  - servizi alti 56 px;
  - avatar da 46 px, senza la seconda riga sotto il nome;
  - titoli dei blocchi da 16 px.
- Il riepilogo e «Fissa l'appuntamento» stanno sulla stessa riga in fondo.
- Il desktop non cambia.

### Prezzo per il cliente: sconto o offerta (nuovo-7-prezzo e appuntamento-prezzo, nuove)

- **Nel blocco «Cosa»**, sotto i servizi, c'è la riga **Prezzo** con il prezzo del listino e il pulsante **«Cambia prezzo»**. Il pulsante apre:
  - le scorciatoie **Prezzo pieno**, **−10%**, **−20%** e **Omaggio**;
  - il campo «Prezzo per questo cliente (€)»;
  - il campo «Motivo · facoltativo»;
  - la nota «Vale solo per questo appuntamento. Il listino non cambia e le statistiche contano il prezzo fatto.».
- Quando il prezzo cambia, la riga mostra il vecchio prezzo barrato e quello nuovo in verde. Il riepilogo diventa per esempio «24 € invece di 30 €».
- **Nel dettaglio di un appuntamento già fissato** c'è la stessa riga Prezzo con «Cambia prezzo», per fare lo sconto anche dopo, per esempio alla cassa.
- **Schermate nuove**:
  - `nuovo-7-prezzo-p/-d`: Taglio e barba a 25 € invece di 30 €, con motivo «Cliente fedele»;
  - `appuntamento-prezzo-p/-d`: il dettaglio con il prezzo portato a 15 €, con motivo «Promo studenti».
- **Classi nuove in `Flow`**: `price`, `priceChanged`, `priceLabel`, `priceValue`, `priceOld`, `priceEdit`, `priceEditor`, `quicks`, `quick`, `quickOn`, `priceFields`, `priceBox`.
- **Richiede lavoro sul sito**:
  - sull'appuntamento servono i campi `prezzo_fatto` e `motivo_prezzo`. Il prezzo del listino resta salvato a parte, per confronto;
  - le statistiche usano `prezzo_fatto`.

### Statistiche: versione semplice (statistiche, statistiche-settimana, statistiche-anno)

- **Tolte**: mappa delle fasce orarie, servizi più richiesti, clienti da richiamare, poltrone occupate, non presentati, clienti che tornano, grafico a barre.
- **Restano**:
  - una **scheda prugna** con il periodo e le frecce, l'**incasso** in grande, la variazione e un'**area morbida** dell'andamento (giorni o mesi, con le date di inizio e fine e il giorno migliore);
  - **tre numeri**: Appuntamenti, Scontrino medio, Clienti nuovi;
  - **Per operatore**: incasso e appuntamenti, con una barra sottile;
  - **Top clienti**: i primi 3.
- **Visibilità**:
  - la sezione la vede **solo il titolare**, come scritto in fondo alla pagina;
  - «Per operatore» compare solo se nel salone lavora più di una persona. Va implementato.
- **Token**: `--chart-area`, il riempimento albicocca trasparente sotto la linea.

### Impostazioni (impostazioni-p/-d)

- **Profilo** in cima, come scheda grande con l'avatar. Prima era a metà pagina.
- **Righe con icona colorata** e una riga di spiegazione sotto ogni voce, divise in **Il salone**, **Messaggi** e **Aiuto**. «Esci da Taglendo» è un pulsante a parte in fondo.
- **Spostate**: «Email automatiche ai clienti» e «Avvisi» passano nel nuovo gruppo «Messaggi».
- **Testi nuovi**, da rivedere:
  - le spiegazioni sotto le voci: «Servizi, prezzi e orari di ogni giorno», «Anticipo, annullamenti e spostamenti», «Foto, descrizione e contatti», «Conferme e promemoria», «Cosa ti notifichiamo e quando»;
  - il titolo del gruppo «Messaggi».

### Link di prenotazione (link-p/-d)

- **Scheda prugna** con logo, nome del salone e indirizzo in una pillola. Sotto, tre pulsanti con icona: **«Copia link»** (albicocca), **«Condividi su WhatsApp o Instagram»** e **«Apri la tua pagina»**.
  - Prima, su telefono, i pulsanti sulla scheda scura non si vedevano.
- **«Regole attive»** come righe con icona. «Attiva» è in verde.
- **Nuovo blocco «Dove metterlo»**, con tre idee: bio di Instagram, WhatsApp Business, Google Maps. Sono testi nuovi, da rivedere.
- **Classi**: nuovo modulo `Settings-module__tgSe01__*`, usato da entrambe le pagine.
- **Proposta, non inserita**: un codice QR da stampare per il bancone. Richiede una libreria per generarlo.

## Giro 6 · menu a tendina su telefono, prezzo con la matita, resoconto del giorno

### Menu su telefono (sostituisce quello del giro 5)

- **Barra in alto**: logo a sinistra, poi il **nome della sezione con una freccina**, per esempio «Agenda ▾». A destra c'è l'**avatar**, che porta al profilo. Nell'agenda di un altro giorno c'è anche «Oggi».
- **Il nome della sezione** apre un **menu a tendina** subito sotto la barra:
  - le sezioni in elenco, con icona, e quella attiva evidenziata con la spunta;
  - poi «Copia il link di prenotazione» ed «Esci».
- Si chiude con un tocco fuori, con Esc o scegliendo una voce.
- **Perché**: il pulsante «Menu» e i riquadri del giro 5 erano pesanti. Così il titolo stesso fa da selettore, come nelle app che cambiano sezione dall'intestazione, e la barra resta pulita.
- **Azioni spostate**:
  - il profilo passa dal menu all'avatar in alto a destra;
  - «Link» nel menu si chiama di nuovo «Link di prenotazione», come nella barra laterale.
- **Classi**:
  - nuove: `mbSwitch`, `mbChevron`, `mbAvatar`, `menuDrop`, `menuNav`, `menuFoot`, `menuLink`, `menuLinkOn`, `menuLinkIcon`, `menuLinkText`, `menuCheck`;
  - da togliere quando si porta il design nell'app: `mbMenu`, `menuGrid`, `menuItem`, `menuRow` e simili del giro 5.
- **Testi nuovi**: «Il tuo profilo, Andrea» e «Menu», tutti e due solo per i lettori di schermo.

### Prezzo: si cambia dalla matita

- Il prezzo è ora una riga discreta sotto i servizi: «Prezzo 20 €», con una **piccola matita** tonda accanto.
- La matita ha l'etichetta per i lettori di schermo «Cambia prezzo», e il pulsante con la scritta non c'è più.
- Il pannello dello sconto (Prezzo pieno, −10%, −20%, Omaggio, cifra, motivo) si apre solo toccando la matita.
- Stessa cosa nel dettaglio dell'appuntamento.
- Con il prezzo cambiato, la riga mostra il vecchio prezzo barrato e il nuovo in verde.

### Statistiche · resoconto del giorno (statistiche-giorno-p/-d, nuova)

- **Nel selettore** c'è ora **Giorno**, prima di Settimana, Mese e Anno.
- **Contenuto**:
  - la scheda prugna con il giorno («Giovedì 5 novembre») e le frecce, l'**incasso del giorno**, il confronto con la media dello stesso giorno della settimana e la riga «Giornata chiusa alle 19:00 · 12 clienti serviti»;
  - **tre numeri**: Clienti, Scontrino medio, **Sconti fatti** (−8 €), più una riga con non presentati e annullati;
  - **per operatore**: incasso e numero di clienti;
  - **tutti gli appuntamenti del giorno**: ora, avatar, cliente, servizio, operatore e motivo dello sconto. Il prezzo scontato è in verde col vecchio barrato. Non presentati e annullati sono barrati, con un'etichetta;
  - in fondo, il **totale incassato** e **«Invia il resoconto su WhatsApp»**.
- **Dati d'esempio coerenti**: Andrea 88 € + Marco 92 € + Simone 67 € = 247 €.
- **Testi**: tutti nuovi, da rivedere.
- **Classi nuove in `Stats`**: `dayNote`, `dayList`, `dayTime`, `priceCol`, `priceOld`, `priceDisc`, `rowMuted`, `badge`, `badgeNoShow`, `badgeCanceled`, `dayTotal`, `share`.
- **Richiede lavoro sul sito**:
  - la media per giorno della settimana, per il confronto;
  - il testo del messaggio WhatsApp: totale, clienti, per operatore e sconti.

## Giro 7 · menu a pannello laterale, disposizione delle statistiche

### Menu su telefono (sostituisce quello dei giri 5 e 6)

- **Barra in alto**: logo, nome della sezione e, a destra, il pulsante **«Menu»** del giro 5 (le tre righe con la scritta «Menu»). Nell'agenda di un altro giorno c'è anche «Oggi».
- **Il «Menu»** apre un **pannello laterale da destra**, a tutta altezza e largo fino a 340 px. Contiene:
  - in alto, una testata prugna con l'avatar, il nome e «Titolare · Barberia Saragozza», che porta al profilo, e la X per chiudere;
  - sotto, le sezioni in elenco, con la sezione attiva evidenziata e la spunta;
  - in fondo, «Copia il link di prenotazione» ed «Esci».
- Si chiude con la X, con un tocco fuori o con Esc.
- **Azioni spostate**: il profilo passa dall'avatar nella barra (giro 6) alla testata del pannello.
- **Testi nuovi**: «Chiudi il menu», solo per i lettori di schermo, e «Titolare · Barberia Saragozza» nella testata (per il barbiere, «Barbiere · Barberia Saragozza»).
- **Classi**:
  - nuove: `menuDrawer`, `drawerHead`, `drawerProfile`, `drawerAvatar`, `drawerWho`, `drawerName`, `drawerRole`, `drawerClose`;
  - restano `mbMenu`, `menuNav`, `menuLink`, `menuLinkOn`, `menuFoot`;
  - non servono più `mbSwitch`, `mbChevron`, `mbAvatar`, `menuDrop`.

### Statistiche: disposizione (statistiche, -settimana, -mese, -anno, -giorno)

- **In alto**: il titolo, poi il selettore Giorno · Settimana · Mese · Anno. Su telefono il selettore occupa tutta la larghezza.
- **Scheda prugna a tutta larghezza**, con dentro:
  - il periodo e le frecce;
  - l'incasso con la variazione;
  - **i tre numeri**, ora dentro la scheda e separati da linee sottili, non più riquadri a parte. Su desktop stanno a destra dell'incasso, su telefono sotto;
  - l'andamento a tutta larghezza.
- **Sotto, due colonne su desktop**:
  - nelle viste Settimana, Mese e Anno: «Per operatore» e «Top clienti»;
  - nel Giorno: «Per operatore», che resta ferma mentre scorri, e «Tutti gli appuntamenti».
  - Su telefono le schede stanno una sotto l'altra.
- **Nel Giorno**, la riga sui non presentati e annullati passa dentro la scheda prugna.
- **Classi nuove**: `heroMain`, `heroFigure`, `heroStats`, `heroStat`, `pair`, `pairDay`. Le classi `tiles` e `tile` non sono più usate da queste pagine.

## Giro 8 · pagina Profilo (profilo, profilo-password, profilo-elimina-account · -p e -d)

### Disposizione
- **In alto**: «‹ Impostazioni» e il titolo «Profilo», come prima.
- **Scheda prugna** con la tua foto o l'iniziale, il pulsante della fotocamera per cambiarla, il nome, il ruolo, «Con Taglendo da …» e tre numeri: clienti del mese, incasso del mese, prossimo cliente.
- **Dati personali**, in una scheda: nome e cognome, email (con la nota sul codice di conferma, invariata), telefono e colore in agenda, poi «Salva».
- **Elenchi a righe**, come in Impostazioni:
  - **Il tuo lavoro**: Poltrona, I tuoi orari, Prenotabile online (interruttore);
  - **Sicurezza**: Password, Dispositivi collegati;
  - **Abbonamento**: scheda del piano con lo stato, poi Metodo di pagamento e Ricevute;
  - **Account**: Esporta i miei dati, Elimina l’account (in rosso).
- **Su desktop** due colonne: a sinistra la scheda prugna e i dati personali, a destra gli elenchi. Su telefono tutto in una colonna.
- Le finestre «Cambia la password» ed «Eliminare l’account?» restano identiche. Si aprono dalle righe Password ed Elimina l’account.

### Azioni
- **Spostate**: «Cambia la password» ed «Elimina l’account» passano da pulsanti a righe dentro i gruppi Sicurezza e Account.
- **Nuove**: cambia foto, colore in agenda, interruttore Prenotabile online, Dispositivi collegati, Metodo di pagamento, Ricevute.
- **Nessuna azione tolta.**

### Testi nuovi (da rivedere)
- «Cambia la tua foto» (solo per i lettori di schermo), «Con Taglendo da marzo 2023», «Clienti a ottobre», «Incasso a ottobre», «Prossimo cliente».
- «Telefono · facoltativo», «Il tuo colore in agenda» e i nomi dei colori, letti dai lettori di schermo: Prugna, Albicocca, Pesca, Malva.
- I titoli dei gruppi: «Il tuo lavoro», «Sicurezza», «Abbonamento», «Account».
- Le voci delle righe: «Poltrona», «I tuoi orari», «Come il salone · Mar–Sab», «Prenotabile online», «I clienti possono sceglierti dal link», «Cambiata oggi», «Dispositivi collegati», «Questo telefono e 1 computer».
- Abbonamento e account: «Salone · 3 poltrone», «Attivo», «Si rinnova il 1 dicembre 2026», «Metodo di pagamento», «Carta che finisce con 4242», «Ricevute», «Scarica le fatture dei mesi passati», «File con agenda, clienti e listino».
- Nel prototipo, gli avvisi: «Profilo salvato», «Colore in agenda», «Sei prenotabile online» / «Non sei più prenotabile online».
- Tutti i numeri e le date sono di esempio.

### Richiede lavoro sul sito
- Campi nuovi nel profilo dell'operatore: **telefono**, **colore in agenda** (oggi il colore è dato dall'ordine dell'operatore), **prenotabile online** e **foto**.
- **Dispositivi collegati**: elenco delle sessioni aperte, con la possibilità di chiuderle.
- **Abbonamento**: piano, stato, rinnovo, metodo di pagamento e ricevute, dal servizio di pagamento.
- **Numeri nella scheda**: clienti e incasso del mese, prossimo cliente. Per il barbiere sono i suoi.
- «Cambiata oggi» richiede la data dell'ultimo cambio della password.

### CSS
- **Classi nuove** nel modulo `Settings`: `pfPage`, `pfColumns`, `pfCol`, `pfHero`, `pfAvatarWrap`, `pfAvatar`, `pfPhoto`, `pfWho`, `pfName`, `pfRole`, `pfSince`, `pfStats`, `pfForm`, `pfColors`, `pfColor`, `pfSwitch`, `pfPlan`, `pfPlanTop`, `pfPlanName`, `pfPlanBadge`, `pfPlanSub`, `rowButton`, `rowDanger`.
- **Nessun token nuovo.**
- **Classi non più usate** in queste pagine: le classi `Profile-module`.
- **Colori**:
  - lo sfondo dell'avatar è pesca, non albicocca;
  - «Elimina l’account» usa il colore d'errore;
  - le aree di tocco della fotocamera e dei colori sono di 44 px.

## Giro 9 · sito (home) e pagina pubblica del salone, divisore della barra laterale

### Home del sito (home, home-cookie · -p e -d)

**Disposizione**, dall'alto:
1. **Testata**: logo, sezioni, «Accedi» e «Prova gratis». Resta fissa in alto, su fondo crema con una linea sottile sotto.
2. **Apertura**:
   - a sinistra: etichetta, titolo con la sottolineatura albicocca, testo, «Prova gratis» con la freccia, la nota sul prezzo e i tre passi a pillole;
   - a destra: la foto, il telefono con l'agenda nuova, l'adesivo «Basta quaderno.» e un avviso di esempio «Nuova prenotazione».
3. **Striscia con quattro punti**: zero commissioni, senza carta, telefono e computer, nessuna app per i clienti.
4. **Prima e dopo**: il confronto quaderno/Taglendo ora si trascina davvero; con la tastiera si usano le frecce.
5. **Come funziona**: tre schede, ognuna con il telefono che mostra la schermata vera.
6. **Online o al telefono**: due schede con icona ed esempio.
7. **Cosa cambia** (banda prugna):
   - su desktop tre schede affiancate, su telefono una sotto l'altra;
   - in ogni scheda la foto, «Prima» con il testo barrato e «Con Taglendo».
8. **Prezzi**:
   - a sinistra la scheda prugna con il testo, le tre righe e «Prova gratis»;
   - a destra «Tutto incluso», con un'icona per voce al posto dei numeri 01–06.
9. **Domande frequenti**: su desktop il titolo sta a sinistra e resta fermo mentre scorri, le domande a destra. Su telefono una sotto l'altra.
10. **Fondo**: il riquadro pesca con il modulo email e il piè di pagina, uguale a prima.
11. **Su telefono**: la barra «Prova gratis» in basso diventa una pillola sospesa.

**Azioni**: nessuna tolta. Il modulo email porta a «Registrati». Nell'anteprima «Accetta» e «Rifiuta» chiudono l'avviso cookie.

**Testi nuovi (da rivedere)**:
- La striscia: «Zero commissioni», «Senza carta di credito», «Telefono e computer», «I clienti non scaricano app».
- L'avviso di esempio, decorativo e nascosto ai lettori di schermo: «Nuova prenotazione», «Luca · Taglio e barba · ven 10:30».
- Nelle domande: «Non trovi la risposta? Scrivici a aiuto@taglendo.it».
- Due titoli cambiano livello:
  - «Gratis durante la beta.» diventa il titolo della sezione Prezzi;
  - «Domande frequenti» ha sopra l'etichetta «Domande».

**Immagini**:
- `shot-agenda-mobile.png`, `shot-listino-mobile.png`, `shot-prenota-mobile.png` e `shot-agenda-desktop.png` sono state rifatte dalle schermate nuove del gestionale e del salone. Stesse dimensioni e stessi nomi di file.
- Corretto il percorso dell'immagine desktop nel confronto: prima puntava a `/images/…` e non si vedeva.

**CSS**:
- Nuovo modulo `Site`.
- Restano del modulo `Marketing`:
  - il piè di pagina;
  - il foglio del quaderno;
  - le domande frequenti.
- La carta del quaderno non aveva colore di fondo e lasciava vedere l'agenda sotto: ora usa `--paper`.
- L'etichetta «Taglendo» del confronto non è più su fondo albicocca: è bianca, con il testo prugna.

### Pagina del salone (salone, prenota-2 … prenota-5 · -p e -d)

**Disposizione**:
1. **Testata prugna fissa**: iniziali del salone in un riquadro pesca, nome e zona, sezioni, telefono e «Prenota».
   - Su telefono «Prenota» sta solo nella barra in basso.
   - Il telefono è un pulsante rotondo con l'icona.
2. **Apertura prugna con gli angoli bassi arrotondati**:
   - lo stato «Aperto · oggi fino alle 13:00» con il pallino verde;
   - nome grande, descrizione e due pulsanti: «Prenota online» crema e «Vedi servizi e prezzi» a contorno;
   - una scheda con indirizzo, orari di oggi e prezzi, che su desktop sta a destra.
   - Il cartello «Aperto» appeso è stato tolto: le sue informazioni sono nello stato e nella scheda.
3. **Prenota online, su fondo chiaro**: tre pillole sopra la scheda («Nessuna registrazione», «Paghi in negozio», «Annulli gratis fino a 2 ore prima»).
   - La scheda di prenotazione è la stessa in tutti gli stati: cambia solo il fondo, ora bianco con un bordo leggero.
   - Il riquadro pesca «Annulli gratis» resta e su desktop rimane fermo mentre scorri.
4. **Chi ti taglia**: su desktop una scheda per barbiere, con l'iniziale e «Prenota con …»; su telefono un elenco a righe.
5. **Dove siamo**:
   - una scheda con una mappa disegnata (non una mappa vera), il nome, l'indirizzo, «Apri in Mappe» e il telefono;
   - una scheda «Orari» con lo stato «Aperto ora» e il giorno di oggi evidenziato con «Oggi».
6. **Piè di pagina** e, su telefono, la barra «Prenota» come pillola sospesa in basso.

**Colori**: i pulsanti «Prenota» non sono più albicocca con il testo sopra. Ora sono crema su prugna.

**Azioni**: nessuna tolta. Nuove:
- **«Prenota con …»** porta alla prenotazione. Sul sito deve scegliere già quel barbiere: **richiede lavoro sul sito**.
- **Prototipo cliccabile**: tutto il percorso funziona. Servizio → giorno e ora → dati → codice (6 cifre qualsiasi) → fatto. Funzionano anche «Cambia», le caselle, i barbieri, i giorni, «Email sbagliata?» e «Nuova prenotazione».

**Testi nuovi (da rivedere)**:
- «Il team», «Prenota con Andrea / Marco / Simone», «Orari», «Aperto ora», «Oggi».
- «Indirizzo», «Oggi», «Prezzi» nella scheda dell'apertura.
- Le tre pillole: «Nessuna registrazione», «Paghi in negozio», «Annulli gratis fino a 2 ore prima».
- Solo per i lettori di schermo: «Chiama il salone, 051 644 2190».

**Dati di esempio puliti**:
- l'email `export-cli-…@example.com` è diventata `mario.rossi@esempio.it`;
- il link `http://localhost:3000/…` di «Aggiungi al calendario» è diventato un percorso relativo.

**Richiede lavoro sul sito**:
- lo stato aperto/chiuso calcolato dall'orario;
- le iniziali del salone, oppure il logo se c'è;
- l'evidenza di «Oggi» negli orari;
- «Prenota con …» che sceglie il barbiere.

**CSS**: nuovo modulo `Shop`. La pagina non usa più `Salon-module`, che resta solo per l'avviso cookie (`Salon-module__cookie`).

### Varianti del salone (salone-rasoio, salone-prezzi-nascosti, salone-solo-telefono · -p e -d) · **nuove**
Nell'esportazione queste tre pagine erano vuote: mostravano «Questa pagina non c’è». Ora sono vere varianti della pagina nuova.
- **salone-rasoio**: salone con una sola poltrona.
  - Il nome «Il Rasoio», l'indirizzo, il telefono e il barbiere «Luca» sono di esempio.
  - «Chi ti taglia» mostra una sola scheda, senza «Prenota con …».
- **salone-prezzi-nascosti**: i servizi senza prezzo. Nell'apertura «Prezzi» diventa «Barbieri», e il pulsante dice «Vedi servizi».
- **salone-solo-telefono**:
  - al posto della prenotazione c'è il «Listino» in sola lettura, con «Chiama per prenotare»;
  - il riquadro a lato dice «Per spostare o annullare · chiama il salone negli orari di apertura»;
  - testata e barra in basso mostrano «Chiama».
- **Testi nuovi**: «Prenota al telefono», «Servizi e prezzi.», «Chiama il salone negli orari di apertura: ti trovano subito il primo posto libero.», «Listino», «5 servizi», «Questo salone prende gli appuntamenti solo al telefono.», «Per spostare o annullare», «Una poltrona, sempre la stessa mano.», «Il barbiere».

### Gestionale: barra laterale su desktop
- La barra con le icone ha ora un fondo bianco e un'ombra molto leggera verso destra (token nuovo `--shadow-rail`). Così si capisce che è una barra a parte, senza una riga marcata.
- Vale per tutte le pagine del gestionale su desktop.

### Token nuovi
`--status-open-dot`, `--status-open-glow`, `--map-bg`, `--map-road`, `--map-block`, `--map-park`, `--shop-content`, `--shop-hero-radius`, `--site-section-gap`, `--site-h2`, `--site-h1`, `--shadow-rail`.

### Rimasto com'è (da decidere)
- Le pagine legali (privacy, termini, cookie) usano ancora testata e piè di pagina vecchi del modulo `Marketing`. Si possono allineare alla home in un giro successivo.
- Le pagine «gestione-*» (la prenotazione vista dal cliente dopo la conferma) non sono state toccate.
- Nel piè di pagina i segnaposto `[ragione sociale]` ecc. sono ancora evidenziati in albicocca col testo sopra, come nell'originale. Vanno sostituiti con i dati veri.

## Giro 10 · home più originale, prenotazione pubblica come quella interna, foto del salone, logo

### Barra laterale del gestionale (desktop)
- **Il fondo bianco del giro 9 è tolto**: la barra torna crema come la pagina.
- **Divisore**: una sola riga sottile a destra (token `--shadow-rail`, ora `1px 0 0 #ecdcd6`).

### Home del sito (home, home-cookie · -p e -d) · **sostituisce la home del giro 9**
L'idea è un **foglio stampato**: righe sottili, sezioni numerate a margine e un listino da barbiere coi puntini. Tolti gli elementi da modello già visto: etichette a pillola, icone nei cerchi, schede tutte uguali, sfumatura di fondo, avviso finto «Nuova prenotazione», striscia con le quattro icone.

**Testata**: logo con l'**icona arancione «t»** accanto alla scritta, come nel gestionale. Le sezioni sono testo semplice, che al passaggio si sottolinea; poi «Accedi» e «Prova gratis».

**Disposizione**:
1. **Apertura**:
   - in alto una riga sottile con «App per barberie da 1 a 3 poltrone» e, su desktop, «Gratis durante la beta · zero commissioni»;
   - poi il titolo molto grande con la sottolineatura albicocca;
   - sotto, dopo una riga, il testo a sinistra e «Prova gratis» con «Senza carta di credito» a destra;
   - infine la foto larga con il telefono appoggiato sopra e il foglietto «Basta quaderno.» attaccato con lo scotch.
2. **01 Prima e dopo**: il confronto che si trascina.
3. **02 Come funziona**: tre righe, ognuna con il numero grande, il testo e, su desktop, la schermata del telefono.
4. **03 Come prenotano**: le due modalità affiancate e separate da «oppure».
5. **04 Cosa cambia** (banda prugna): tre righe, ognuna con la foto, la frase barrata e la frase nuova.
6. **05 Prezzi**: a sinistra il testo e «Prova gratis», a destra il **«Listino Taglendo»**.
   - Le voci sono incluse, coi puntini come nei listini dei barbieri.
   - In fondo «Totale durante la beta … 0 €».
7. **06 Domande**: elenco a righe.
8. **Fondo**:
   - «Il primo venerdì senza quaderno.» in grande su fondo pesca, con il modulo email;
   - il piè di pagina, con il logo e l'icona.
- **Su desktop** l'etichetta della sezione (numero e nome) sta a sinistra e resta ferma mentre scorri.

**Testi**:
- **Nuovi**: «Senza carta di credito», «Listino Taglendo», le voci del listino con «inclusa / inclusi», «Totale durante la beta», «oppure», «Gratis durante la beta · zero commissioni».
- **Tolti**:
  - dalla vista, «Prima» e «Con Taglendo» nelle righe di «Cosa cambia»: restano per i lettori di schermo, e a vista c'è la frase barrata e quella nuova;
  - i tre passi a pillole nell'apertura (sono in «Come funziona»);
  - la striscia con le quattro icone;
  - l'avviso finto «Nuova prenotazione».
- Il testo «Nessun impegno…» passa dal riquadro «Tutto incluso» alla colonna di testo dei Prezzi.

**CSS**: nuovo modulo `Home`. Il modulo `Site` del giro 9 è stato tolto da `app.css`.

### Pagina del salone · prenotazione come nel gestionale (salone, prenota-2 … prenota-5, varianti)
- **Stessa schermata della prenotazione interna**: blocchi numerati, schede dei servizi, persone con l'avatar, giorni a pillola, calendario dei mesi, orari divisi in Mattina e Pomeriggio, riepilogo in fondo con «Prenota». Al posto dei 3 passi a fisarmonica.
- **Ordine per il cliente**: **1 Cosa · 2 Con chi · 3 Quando · 4 I tuoi dati**.
  - Nel gestionale è Quando · Cosa · Con chi · Per chi.
  - Per il cliente il servizio viene prima perché la durata decide gli orari liberi. Se vuoi l'ordine identico al gestionale, si cambia in un attimo.
- **Comportamento**:
  - scelta una cosa, la pagina scorre al blocco dopo;
  - per oggi si vedono solo gli orari ancora possibili;
  - «Prenota» si attiva quando ci sono servizio, orario, nome, email e informativa privacy.
- **Riepilogo**: su telefono resta attaccato in fondo alla scheda; su desktop è una pillola che scorre con la scheda. La barra «Prenota» in basso sparisce quando la prenotazione è sullo schermo.
- **Codice e conferma** (prenota-4, prenota-5): stessa scheda bianca. Sopra il codice c'è il riepilogo con la spunta e «Cambia», che riporta a «I tuoi dati».
- **Una poltrona sola** (salone-rasoio): niente blocco «Con chi», i blocchi diventano 3.
- **Prezzi nascosti**: le schede mostrano solo la durata.
- **Solo telefono**: «Listino» e, in fondo, «Chiama per prenotare».
- **Testi nuovi**: «Cosa», «Con chi», «Quando», «I tuoi dati», «Chiunque · il primo libero», «Scegli servizio, giorno e ora», «Scegli giorno e ora», «Orari con … · Barrato = occupato» (come nel gestionale), «Cambia».
- **Testi tolti**: «Prenota · 0 di 3 fatto», «Primi orari liberi» e le frecce della settimana. Ora si usano i giorni a pillola e il calendario.

### Pagina del salone · foto (nuova sezione)
- **«Il salone · Dentro la barberia.»** subito dopo l'apertura:
  - su desktop un mosaico, una foto grande e tre piccole;
  - su telefono una fila che si scorre col dito.
- Toccando una foto si apre a tutto schermo, con avanti, indietro, chiudi e le frecce della tastiera.
- La voce «Foto» è anche nella testata.
- **Richiede lavoro sul sito**: le foto arrivano da Impostazioni › Pagina del salone.

### Impostazioni › Pagina del salone (pagina-salone · -p e -d) · **nuova**
Nell'esportazione era un segnaposto («Fase 4»).
- **In alto**: anteprima prugna con la foto, il nome, il link e «Apri», che porta alla pagina pubblica.
- **Foto del salone**:
  - griglia con «Copertina» sulla prima;
  - su ogni foto una stella («Usa come copertina») e una X («Togli la foto»);
  - un riquadro «Aggiungi foto · dal telefono o dal computer», con il contatore «4 di 8» (massimo 8);
  - nel prototipo aggiungi, togli e cambi copertina funzionano.
- **Come ti presenti**: nome del salone, zona, descrizione (massimo 160 caratteri), telefono, indirizzo, poi «Salva».
- **Prenotazione**:
  - interruttori «Prenotazione online» e «Mostra i prezzi», che corrispondono alle varianti solo telefono e prezzi nascosti;
  - la riga «Servizi e orari» porta a Listino e orari.
- **Richiede lavoro sul sito**: caricamento, ordine e copertina delle foto (massimo 8); i campi descrizione e zona; i due interruttori.

### Logo nel sito pubblico
- **Home**: icona «t» su fondo albicocca accanto alla scritta, in testata e nel piè di pagina.
- **Pagina del salone**: nel piè di pagina, «Prenotazioni con» + icona + scritta.

### Token
- **Nuovi**: `--home-rule`, `--home-rule-light`, `--home-max`, `--home-label`, `--home-h1`, `--tape`, `--backdrop-photo`.
- **Cambiato**: `--shadow-rail`.

## Giro 11 · home d'impatto e prenotazione pubblica a passi

Prima di disegnare ho fatto una ricerca sulle home di Booksy, Fresha e Treatwell e sui flussi di prenotazione (Baymard, Timely, Setmore). Il rapporto è a parte: «Home e prenotazione barberie.md».

### Home del sito (home, home-cookie · -p e -d) · **sostituisce le home dei giri 9 e 10**

**Disposizione**:
1. **Apertura scura a tutta altezza dello schermo** (`100svh`):
   - la foto del barbiere in bianco e nero sotto un velo prugna;
   - la testata trasparente, che diventa crema quando scorri;
   - a sinistra il titolo molto grande, con «sempre in tasca.» sottolineato in albicocca, poi il testo e «Prova gratis» (pulsante crema) con «Gratis durante la beta · Zero commissioni · senza carta»;
   - a destra un **telefono con l'agenda vera e animata**: un posto libero (verde) si riempie, in alto arriva l'avviso «Nuova prenotazione», poi si ricomincia;
   - su desktop, in basso, la freccia «Scopri come funziona».
2. **Nastro prugna che scorre** con le cose incluse: Agenda per poltrona · Link di prenotazione · Conferma via email · Rubrica clienti · Messaggi WhatsApp pronti · Telefono e computer · Zero commissioni.
3. **Come funziona**:
   - su desktop, racconto a scorrimento: a sinistra i tre passi, a destra un telefono fermo che cambia schermata quando il passo arriva al centro;
   - su telefono, tre schede ognuna con la sua schermata;
   - l'animazione non prende il controllo dello scorrimento.
4. **Prima e dopo**: il confronto quaderno/Taglendo che si trascina.
5. **Cosa cambia** (prugna): tre schede con foto. Quando compaiono, la riga albicocca barra la frase «Prima» e subito dopo appare «Con Taglendo».
6. **Online o al telefono**: un interruttore a due posizioni (la pillola scivola) che cambia testo e anteprima della pagina del salone.
7. **Prezzi**: un grande «0 €» che, quando arriva sullo schermo, scende da 29 a 0. Accanto il «Listino Taglendo» coi puntini.
8. **Domande frequenti**.
9. **Chiusura prugna** «Il primo venerdì senza quaderno.» con il modulo email, e il piè di pagina con il logo e l'icona.
10. **Su telefono**: la barra «Prova gratis» in basso compare solo dopo l'apertura.

**Movimento**:

| Dove | Che cosa | Tempi |
| --- | --- | --- |
| Titolo dell'apertura | entrata a cascata delle parole (sale, sfocato → nitido) | 300 ms per parola, 60 ms tra una e l'altra |
| Sottolineatura | si traccia da sinistra | 300 ms |
| Sezioni | compaiono allo scorrimento, una volta sola | 300 ms |
| «Cosa cambia» | riga che barra la frase | 300 ms |
| Interruttore | la pillola scivola | 240 ms |
| Telefono di «Come funziona» | dissolvenza tra le schermate | 250 ms |
| Pulsanti | si stringono alla pressione (0,97) | 160 ms |

- Le eccezioni alla regola 150–300 ms, da approvare: il nastro scorre di continuo (40 s per giro, lineare, si ferma al passaggio del mouse) e la demo del telefono si ripete ogni 2,8 s.
- **Movimento ridotto** (`prefers-reduced-motion`): nessuna entrata, nastro fermo e a capo, demo ferma, cambi solo in dissolvenza.
- La demo si ferma quando non è sullo schermo.

**Su telefono**:
- `viewport-fit=cover` e `theme-color` prugna nell'intestazione della pagina;
- spazi per la tacca e per la barra in basso (`env(safe-area-inset-*)`);
- niente lampo grigio al tocco;
- `touch-action: manipulation` sui pulsanti;
- campi a 16 px (niente zoom);
- effetti al passaggio del mouse solo su `(hover: hover) and (pointer: fine)`.

**Testi nuovi**:
- Nell'apertura: «I clienti prenotano dal tuo link a qualsiasi ora. Tu vedi ogni appuntamento sul telefono e sul computer.». È il testo di prima, accorciato.
- Nella demo:
  - «Venerdì 6», «3 clienti · 2 posti liberi», «agenda piena»;
  - «Libero · 30 min», «prenotabile dal link»;
  - i nomi di esempio;
  - «Nuova prenotazione».
- Altri: le voci del nastro, «Primi orari liberi» nell'anteprima online, «Scopri come funziona» (solo per i lettori di schermo).

**CSS**:
- Nuovo modulo `Land`. Il modulo `Home` del giro 10 è stato tolto.
- Token nuovi: `--land-scrim`, `--land-scrim-phone`, `--land-h1`, `--land-h2`, `--land-max`, `--land-phone-w`, `--ease-in-out-strong`.
- Token che mancavano e che erano già usati: `--duration-normal`, `--duration-slow`, `--space-10`.

### Pagina del salone · prenotazione a passi (salone, prenota-2, prenota-3, varianti)
**Una domanda alla volta** al posto dei blocchi tutti aperti:
1. **Cosa ti facciamo?**: righe grandi con nome, durata e prezzo; si tocca e si va avanti.
2. **Con chi?**: in cima «Chi è libero prima · Ti mostriamo più orari», poi i barbieri con l'avatar. Con una sola poltrona questo passo non c'è.
3. **Quando vieni?**
   - In alto **«Prima disponibilità · Oggi alle 11:30 con …»**, un tocco e si va ai dati.
   - Poi «oppure scegli tu»: giorni con **Oggi / Domani**; i giorni di chiusura sono tratteggiati con «chiuso».
   - Il riquadro «Altre date» apre il calendario dei mesi.
   - **Solo gli orari liberi**, ogni 30 minuti, divisi in Mattina e Pomeriggio. Gli orari occupati non si vedono più barrati.
   - Se il giorno è pieno: «Questo giorno è pieno.» con **«Vai al prossimo giorno libero»**.
4. **Ultimo passo: i tuoi dati**:
   - riepilogo con «Cambia» su servizio, barbiere e quando, più il prezzo;
   - nome, email («Ti mandiamo un codice per confermare.») e telefono facoltativo;
   - informativa privacy e novità;
   - il pulsante dice cosa prenoti: **«Prenota · Ven 6 nov, 11:30»**. Finché manca qualcosa resta tenue e sotto dice «Mancano: nome, email, informativa privacy.». Se lo tocchi lo stesso, la frase diventa rossa, trema un attimo e il cursore va sul primo campo da riempire.

**In testa alla scheda**:
- «Passo 2 di 4 · Barbiere», con una barra in quattro tratti e la freccia per tornare indietro;
- resta in vista mentre scorri.

**Passaggi tra le domande**: avanti scorre da destra, indietro da sinistra (240 ms). Il cursore va sul titolo della domanda nuova.

**«Prenota con …» nel team**: ora sceglie davvero quel barbiere. Se il servizio è già scelto porta all'orario, altrimenti al servizio, e poi salta la domanda «Con chi?».

**Codice e conferma** (prenota-4, prenota-5): invariati rispetto al giro 10.

**Testi nuovi**:
- Intestazione della sezione: «Prenota in un minuto.», «Una domanda alla volta: cosa, con chi, quando. Nessuna registrazione, paghi in negozio.»
- Le quattro domande: «Cosa ti facciamo?» / «Scegli un servizio. Paghi in negozio.», «Con chi?» / «Se non hai preferenze, scegli il primo libero.», «Quando vieni?» / «Ti mostriamo solo gli orari liberi.», «Ultimo passo: i tuoi dati».
- Barbiere: «Chi è libero prima», «Ti mostriamo più orari», «Barbiere».
- Orario: «Prima disponibilità», «oppure scegli tu», «Altre date», «chiuso», «Questo giorno è pieno.», «Vai al prossimo giorno libero».
- Dati: «Ti mandiamo un codice per confermare.», «Mancano: …», «Paghi in negozio. Annulli gratis fino a 2 ore prima.».

**Richiede lavoro sul sito**:
- calcolo della prima disponibilità per servizio e barbiere;
- orari liberi a passi di 30 minuti, o del passo scelto dal salone;
- prossimo giorno libero;
- «Prenota con …» che passa il barbiere alla prenotazione.

### Caso peggiore (pagina del salone)
Ho provato nome lungo del salone, zona lunga, 10 servizi con nomi lunghi, nomi lunghi dei barbieri, email lunga, telefono con interno, 1, 3 e 8 foto, a 320 px e su desktop.

| # | Gravità | Dato | Cosa succedeva | Correzione |
| --- | --- | --- | --- | --- |
| 1 | Rotto | zona del salone lunga | a 320 px la testata usciva dallo schermo (scorrimento orizzontale) | zona con i puntini di sospensione, marchio che si restringe |
| 2 | Brutto | 1 o 3 foto | su desktop restava una riga vuota alta 230 px | mosaico per 1, 2, 3, 4 e da 5 a 8 foto |
| 3 | Brutto | «Prenota con Giovanbattista» | a 320 px il collegamento usciva dalla scheda | su telefono il collegamento va sotto il nome |
| 4 | Brutto | orari «9:00–13:00 · 14:30–19:00» | andavano a capo a metà orario | ogni fascia resta intera, va a capo solo tra le fasce |
| 5 | Brutto | nome lungo + 4 voci in testata | «Dove siamo» andava su due righe | voci della testata su una riga sola |

**Ha retto senza modifiche**: titolo lungo nell'apertura, servizi con nomi lunghi nella prenotazione, email lunga nel campo e nel riepilogo, 8 foto.

**Da decidere**:
- un limite di lunghezza per il nome del salone e per la zona (oggi non c'è);
- con 1 foto, se mostrarla larga com'è ora o non mostrare la sezione.

## Giro 12 · home: telefono con la vera agenda, «Pronto in 3 passi», chiusura nuova

### Apertura: il telefono mostra la vera agenda di Taglendo
- **Cosa si vede**:
  - al posto dell'agenda disegnata a mano c'è la **schermata Agenda del gestionale su telefono** (agenda-oggi-p), rimpicciolita dentro la cornice;
  - ogni 3 secondi circa arriva il vero avviso «Nuova prenotazione online · Gianni Ferraro · 09:30 con Andrea»;
  - il posto libero «Libero 30 min · Andrea» diventa la prenotazione, con «Online» nel dettaglio e una sottile riga albicocca a sinistra; poi tocca a Simone, e si ricomincia.
- **Come funziona nel prototipo**: la cornice carica `agenda-oggi-p.html?demo=1`. In modalità demo la pagina non si tocca, non mostra la barra di scorrimento e fa l'animazione da sola. Con il movimento ridotto resta ferma.
- **Richiede lavoro sul sito**: nel sito vero conviene un breve video registrato dall'app, oppure il componente Agenda vero in sola lettura con dati di esempio. Una pagina intera dentro la home pesa troppo.

### «Come funziona» → «Pronto in 3 passi.»
- **Tre schede affiancate su desktop**, una sotto l'altra su telefono. Ognuna ha il numero, una riga tratteggiata verso il passo dopo (desktop), il titolo, il testo e il telefono con la **schermata vera** di quel passo:
  1. Listino e orari;
  2. la prenotazione del cliente («Quando vieni?» con «Prima disponibilità»);
  3. l'Agenda.
- La scheda centrale è pesca. Le schede compaiono una dopo l'altra (80 ms di distanza).
- Tolto il racconto a scorrimento con il telefono fermo del giro 11.
- **Testi nuovi**: «Pronto in 3 passi.», «Dieci minuti oggi, e da domani i clienti prenotano da soli, anche quando hai le mani occupate.», il passo 3 «Ritrovi tutto in agenda» con «Ogni prenotazione arriva in agenda, con barbiere e servizio. Chi entra senza appuntamento lo aggiungi in pochi tocchi.».
- **Immagine**: `shot-prenota-mobile.png` rifatta dalla nuova prenotazione a passi.

### Chiusura (banner finale)
- **Struttura**: non più una fascia prugna a tutta larghezza, ma un **riquadro prugna con angoli arrotondati**, con due cerchi sottili decorativi in alto a destra.
  - A sinistra: «Inizia adesso», il titolo e tre spunte.
  - A destra una **scheda crema con il modulo**: in alto l'anteprima «Il tuo link di prenotazione», che si scrive mentre digiti il nome della barberia (taglendo.it/barberia-saragozza-e-figli); sotto i campi «Nome della barberia» ed «Email», il pulsante «Crea il mio link gratis →» e «Hai già un account? Accedi».
- Su telefono la barra «Prova gratis» in basso sparisce quando arrivi alla chiusura.
- **Testi nuovi**: «Inizia adesso», «Stasera apri il salone online. Domani prenotano da soli.» (al posto di «Il primo venerdì senza quaderno.»), «Gratis durante la beta», «Senza carta di credito», «Zero commissioni, sempre», «Il tuo link di prenotazione», «la-tua-barberia», «Nome della barberia», «Es. Barberia Saragozza», «Crea il mio link gratis», «Hai già un account? Accedi».
- **Testi tolti**: «Lasci l’email, crei il salone in dieci minuti e condividi il link con i clienti.» e «Gratis durante la beta, niente carta di credito.» (il senso resta nelle spunte e in «Pronto in 3 passi»).
- **Richiede lavoro sul sito**: la registrazione riceve anche il nome della barberia (campo `salone`) per proporre il link, e va controllato che quel link sia libero.

## Giro 13 · banner finale con la sola chiamata all'azione
- **Tolto il modulo** dal banner finale, cioè i campi nome della barberia ed email e l'anteprima del link: nel banner resta solo la chiamata all'azione.
- **A destra** un grande pulsante crema «Crea il mio link gratis →», che porta a Registrati, e sotto «Hai già un account? Accedi».
- **A sinistra**, invariati, «Inizia adesso», il titolo «Stasera apri il salone online. Domani prenotano da soli.» e le tre spunte. Su desktop il titolo ha più spazio.
- **Testi tolti** rispetto al giro 12: «Il tuo link di prenotazione», «la-tua-barberia», «Nome della barberia», «Es. Barberia Saragozza», «La tua email».
- **Non serve più** il lavoro sul sito per ricevere il nome della barberia dalla home.

## Giro 14 · banner finale equilibrato
- **Su tablet e desktop** il banner è centrato su una sola colonna, così non resta spazio vuoto a destra:
  - «Inizia adesso»;
  - il titolo su due righe;
  - le tre spunte in fila;
  - il pulsante «Crea il mio link gratis →»;
  - sotto, «Hai già un account? Accedi».
- **Decorazione**: i cerchi sono uno in alto a destra e uno in basso a sinistra, per simmetria.
- **Su telefono** il banner resta allineato a sinistra, come prima.
- **Testi**: nessun cambiamento.

## Giro 15 · titolo dell'apertura, titolo del banner, piè di pagina nuovo

### Apertura
- **Titolo su due righe pensate**: «La tua agenda online,» sulla prima e «sempre in tasca.» sulla seconda, sottolineata. Prima la parola «online,» restava da sola su una riga.
- **Dimensione** un po' più contenuta (token nuovo `--land-hero-h1`, fino a 80 px), così il testo sta in equilibrio con il telefono.
- **Su desktop** la colonna del testo e il telefono stanno in una griglia a due colonne, centrate in altezza.
- **Su telefono** il titolo va a capo da solo, come prima.

### Banner finale
- **Titolo nuovo**: «Meno telefonate, **più tagli.**» (le ultime due parole in pesca), al posto di «Stasera apri il salone online. Domani prenotano da soli.».
- **Riga nuova sotto il titolo**: «Apri la tua pagina in dieci minuti: i clienti prenotano da soli, anche quando hai le forbici in mano.»

### Piè di pagina (solo la home)
- **Fondo**: prugna più scuro, per staccarlo dal banner.
- **Contenuto**:
  - a sinistra il logo con l'icona, la frase «Agenda e prenotazioni online per barberie da 1 a 3 poltrone.» e il pulsante «Prova gratis →»;
  - a destra tre colonne con titoli pesca: Prodotto, Legale e Contatti.
- **Scritta di sfondo**: in basso una grande scritta «taglendo» appena visibile, tagliata dal bordo.
- **Riga finale**: © 2026, ragione sociale, P.IVA, sede legale e «Foto dimostrative».
- **Segnaposto** («[ragione sociale]», ecc.): non sono più evidenziati in albicocca col testo sopra, ma con un bordo tratteggiato. Vanno comunque sostituiti con i dati veri.
- **Testi nuovi**: «Prova gratis» nel piè di pagina e «Ti rispondiamo noi, di persona.» sotto i contatti; la frase è la stessa già usata in Impostazioni › Aiuto.
- **CSS**: modulo `Land`, classi `footer`, `fTop`, `fBrand`, `fLogo`, `fTag`, `fCols`, `fCol`, `fTitle`, `fList`, `fLink`, `fText`, `fWord`, `fBottom` e `fPlaceholder`. Token nuovo `--land-wordmark`.
- **Le altre pagine pubbliche** (privacy, termini, cookie, accedi, registrati) hanno ancora il piè di pagina vecchio del modulo `Marketing`. Si possono allineare quando vuoi.

## Giro 16 · apertura su tre righe con l'accento più forte, piè di pagina più basso

### Apertura
- **Titolo su tre righe**: «La tua agenda» / «online, **sempre**» / «**in tasca.**». È più grande (`--land-hero-h1` fino a 108 px) e ha l'interlinea più stretta.
- **Parole in evidenza**: «sempre in tasca.» è scritto in **albicocca**. È albicocca usata come colore del testo, non come fondo sotto il testo. Contrasto sul fondo prugna scuro di circa 6:1.
- **Tratto sotto «in tasca.»**: un tratto crema a mano libera al posto della riga dritta. All'apertura si disegna da sinistra in 300 ms; con il movimento ridotto è già disegnato.
- **Altezza**: massimo 920 px su schermi molto alti, con meno spazio sopra e sotto. Il testo sotto il titolo è un po' più stretto.
- **Su telefono**: le tre righe restano, con il titolo che si adatta alla larghezza.

### Piè di pagina
- **Più basso**: meno spazio sopra e tra i blocchi, collegamenti più fitti su desktop (sul telefono restano alti 44 px per il dito) e la scritta «taglendo» di sfondo più piccola.

## Giro 17 · testata della home sempre prugna
- **Testata fissa**: quando scorri non diventa più crema. Resta del prugna scuro dell'apertura (token nuovo `--land-header-bg`, leggermente trasparente con sfocatura), con logo chiaro, voci crema e una riga sottile sotto.
- **«Prova gratis»** nella testata è sempre crema con il testo prugna.
- **Colore della barra del telefono** (`theme-color`): era già prugna, quindi ora è uguale alla testata.

## Anteprima statica e prototipo cliccabile

- `.Modal-module__weKyha__modal[open]` è centrata e fissa sullo schermo, e il foglio telefono (`Sheet`) ha `z-index: 40`. Con `showModal()` il comportamento è identico.
- **Nuovo file `js/prototipo.js`**, caricato in fondo a ogni pagina con `<script src="../js/prototipo.js" defer>`. **Serve solo all'anteprima: non va portato nell'app.**
  - **Link**: le rotte (`/agenda`, `/clienti`, `/listino`, `/impostazioni/...`, `/agenda?g=…` e così via) portano alla schermata corrispondente, nella stessa versione telefono o desktop.
  - **Agenda**: «+ Nuovo appuntamento», i posti liberi, «Primi posti liberi», gli appuntamenti, «Cliente in negozio» e «Calendario» aprono le loro finestre, con il velo scuro.
    - Le finestre si chiudono con Esc, con un clic fuori o con Annulla/Chiudi.
    - Dentro il dettaglio, «Sposta» e «Annulla» aprono le finestre giuste.
  - **Nuovo appuntamento e calendario** funzionano del tutto. «Fissa l'appuntamento» chiude la finestra e mostra un avviso di conferma.
  - **Clienti**:
    - la ricerca filtra davvero l'elenco, per nome o per cifre del telefono;
    - «+ Nuovo» apre la finestra Nuovo cliente, dove puoi caricare una foto vera dal tuo dispositivo;
    - il pulsante con la fotocamera nella scheda cambia foto o colore;
    - «Elimina cliente» porta alla sua schermata.
  - **Listino e orari**:
    - le schede Servizi e Orari funzionano;
    - toccando un servizio si apre la finestra di modifica;
    - gli interruttori dei giorni aprono e chiudono il giorno;
    - toccando un giorno si apre il foglio con le sue fasce: si possono aggiungere, togliere e spostare di 15 minuti.
  - **Statistiche**: Settimana, Mese e Anno cambiano vista, e passando sulle barre compare il valore.
  - Le azioni che nell'anteprima non hanno una schermata mostrano l'avviso «Non è nell'anteprima».
- Rimuovendo la riga `<script>` le pagine tornano statiche come prima.

---

## Schermate nuove

- `agenda-calendario-p` e `agenda-calendario-d`: l'agenda con il calendario mensile aperto. A cosa serve e come funziona è descritto nella sezione «Calendario mensile».
- `cliente-nuovo-p` e `cliente-nuovo-d`: la finestra «Nuovo cliente», con foto o colore. È descritta nel giro 3.
- `cliente-foto-p` e `cliente-foto-d`: la finestra per cambiare foto o colore del cliente. È descritta nel giro 3.
- `statistiche`, `statistiche-settimana` e `statistiche-anno`, in versione -p e -d: la nuova sezione Statistiche, descritta nel giro 4.
- `listino-orari` e `listino-orari-giorno`, in versione -p e -d: gli orari per giorno e il foglio per modificarli, descritti nel giro 4.
- `menu-p` (solo telefono), `nuovo-7-prezzo-p/-d` e `appuntamento-prezzo-p/-d`, descritte nel giro 5. `menu-p` mostra ora il menu a tendina del giro 6.
- `statistiche-giorno-p/-d`: il resoconto del giorno, descritto nel giro 6.

## Schermate tolte

Nessuna.

## Dubbi e testi da rivedere

1. **«Con chi»**: l'ho inteso come *il barbiere*. Il cliente ha la sua sezione, «Cliente», subito dopo. Se intendevi il cliente, basta scambiare i titoli.
2. **«Sposta appuntamento»** (`appuntamento-sposta-p/-d`) usa ancora la finestra vecchia. «Cliente in negozio» invece è stata allineata nel giro 3. Conviene portare anche «Sposta» sulle righe (Quando · Con chi), per coerenza.
3. **Titoli in maiuscoletto** («IL SALONE», «LISTINO», «GIORNI DI APERTURA») restano nelle altre aree. Per completare il tono da app vanno cambiati lì, area per area.
4. **Più `<h1>` nella stessa pagina**, già presenti prima e non toccati: `avvio-*`, `cliente-scheda`, `cliente-elimina`, `barbiere-scheda-cliente`, `verifica*`, `componenti`.
5. Nelle intestazioni di colonna della griglia, «Libera · prossimo alle 10:00» ripete l'informazione della colonna destra. La lascerei, ma si potrebbe accorciare.
6. `index.html` non carica Manrope, quindi l'elenco delle schermate si vede in un font di sistema. Non influisce sul design.
7. **Immagini rotte già presenti nell'esportazione** (non dipendono da queste modifiche):
   - `email-anteprima-p/-d` cercano il logo su `http://localhost:3000/brand/taglendo-logo.svg`;
   - `home-p/-d` e `home-cookie-p/-d` cercano `/images/shot-agenda-desktop.png`, un percorso assoluto.
   
   Vanno corretti nell'export: `../assets/brand/…` e `../assets/images/…`.

## index.html

- L'etichetta di `nuovo-4-tutti-gli-orari` è ora «Nuovo appuntamento · altro giorno», per riflettere cosa mostra. È solo l'elenco delle schermate, non un testo dell'app.
- Aggiunta la voce «Agenda · calendario del mese» (`agenda-calendario`).
- Aggiunte le voci «Nuovo cliente · con foto o colore» (`cliente-nuovo`) e «Foto del cliente» (`cliente-foto`).
- Aggiunti il gruppo «Statistiche» e le voci degli orari. «Listino e orari» diventa «Listino e orari · servizi».
