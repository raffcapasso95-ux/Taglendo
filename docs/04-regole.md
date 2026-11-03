# Regole di business

## Orari e prenotazione
- **Orari predefiniti dal primo avvio** (tutti modificabili):
  - martedì–sabato 9:00–19:00;
  - pausa 13:00–14:30;
  - chiuso domenica e lunedì.
- **Orari proposti:** ogni `slot_step_min` (15 o 30 minuti). Un orario è libero se il servizio intero entra prima della chiusura, non tocca pause o chiusure e non si sovrappone a un appuntamento confermato dello stesso operatore.
- **Preavviso minimo:** `min_notice_min`. **Anticipo massimo:** `max_advance_days`.
- **“Nessuna preferenza” sul barbiere:** si assegna il primo operatore libero, nell'ordine delle poltrone.
- **Orario conteso:** se due clienti confermano lo stesso slot, vince il primo. Il secondo vede l'avviso con 3 orari alternativi vicini (stato “Slot conteso” nel prototipo).

## Conferma del cliente
1. Il cliente inserisce nome (almeno 2 caratteri), email valida e telefono facoltativo (solo cifre, + e spazi; massimo 20).
2. Spunta la casella dell'informativa privacy, obbligatoria. Il consenso alle comunicazioni promozionali è facoltativo e parte spento.
3. Riceve un codice di 6 cifre via email (F1). Il codice vale 10 minuti e ammette al massimo 5 tentativi. Si può chiedere di nuovo dopo 60 secondi.
4. Al codice corretto l'appuntamento è confermato, parte l'email F2 e il barbiere riceve l'avviso (D5).

Il cliente non crea nessun account e nessuna password.

## Annullamento e spostamento
- Con `cancel_online` attivo, il cliente annulla dal link nell'email fino a `cancel_limit_min` prima (predefinito 2 ore). Oltre il limite vede E4.
- Gli spostamenti li fa solo il salone, e al cliente parte l'email F6.
- Con `cancel_online` spento, il cliente deve chiamare il salone, e i testi cambiano di conseguenza: conferma, pagina del salone, sezione “come funziona”.

## Modalità del salone
- **booking_online = false (solo telefono):**
  - i pulsanti di prenotazione diventano “Chiama per prenotare”;
  - al posto del modulo compare la scheda con il telefono;
  - listino e orari restano visibili.
- **show_prices = false (prezzi nascosti):**
  - vale sia con la prenotazione online sia con il solo telefono;
  - si tolgono i prezzi da listino, passi, riepilogo, barra mobile ed email;
  - sotto “Listino” compare “Prezzi in salone: chiedi pure al telefono.”;
  - nel riepilogo la riga Prezzo dice “Te lo diciamo in salone”.
- **Abbonamento sospeso o scaduto:** la pagina passa automaticamente a solo telefono (E6), ma i dati restano.

## Email e notifiche
- **Codice (F1):** sempre attivo, non si può spegnere.
- **Email che il salone può spegnere:** confermata (F2), promemoria (F3, alle 18:00 del giorno prima), annullata (F4).
- **Spostata (F6) e invito (F5):** partono sempre quando servono.
- **Promemoria WhatsApp:** restano manuali, con un link `wa.me` dall'agenda.
- **Avvisi al barbiere (C11):**
  - nuova prenotazione online, annullamento del cliente, riepilogo delle 8:00;
  - canale: notifica, email o entrambi;
  - “solo i miei appuntamenti” per il titolare.

## Piani e prova
- **Beta gratuita:** finché `BILLING_ENABLED` è spento, ogni salone ha l'accesso completo e nessuna scadenza; le regole qui sotto valgono dal lancio dei pagamenti (vedi `docs/05-fasi-e-prompt.md`).
- **Prova:** 15 giorni dalla registrazione, con tutte le funzioni e senza carta.
- **Piani:**
  - Solo: 9,90 € al mese + IVA, 1 poltrona;
  - Salone: 19,90 € al mese + IVA, fino a 3 poltrone.
- **IVA:** 22%, mostrata prima della conferma (B2).
- **Aggiunta della seconda poltrona con il piano Solo:** compare la proposta di passare a Salone (B7), con calcolo proporzionale.
- **Fine della prova senza piano:** schermata B3. Il gestionale resta in sola lettura con l'esportazione dei dati, e la pagina passa a solo telefono.
- **Pagamento non riuscito:** avviso B4 e 7 giorni per aggiornare la carta. Poi le prenotazioni online si sospendono.
- **Disdetta (B6):** il piano resta attivo fino alla fine del periodo pagato. Dopo, i dati restano consultabili ed esportabili per 12 mesi.

## Account e permessi
- **Ruoli:** titolare (tutto) e barbiere. Per il barbiere ci sono tre interruttori: vedere l'agenda di tutti, fissare e spostare appuntamenti, vedere telefono ed email dei clienti. Listino, orari, regole e abbonamento li gestisce solo il titolare.
- **Inviti:** valgono 7 giorni.
- **Sessione:** dura 30 giorni, poi si chiede di nuovo la password (D4) senza perdere il lavoro in corso.
- **Eliminazione dell'account (C9):**
  1. si conferma scrivendo ELIMINA;
  2. l'abbonamento si disdice subito;
  3. la pagina va offline;
  4. i dati si cancellano entro 30 giorni.
- **Eliminazione di un cliente (C12):** si cancellano contatti, note e storico. Gli incassi restano nei totali, anonimi, e gli appuntamenti futuri vengono annullati.

## Limiti dei campi
| Campo | Massimo |
|---|---|
| Nome salone | 60 |
| Nome operatore | 40 |
| Nome servizio | 60 |
| Nome cliente | 60 |
| Note | 500 |
| Descrizione della pagina | 160 |
| Telefono | 20 |

I testi lunghi si troncano con i puntini e restano leggibili per intero nel dettaglio.
