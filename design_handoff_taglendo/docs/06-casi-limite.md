# Casi limite da testare

## Dati
- **Nomi e testi lunghi:**
  - cliente: “Giovanni Battista Della Valle-Santangelo”;
  - email da più di 80 caratteri;
  - servizio: “Taglio sfumato con disegno a mano libera e rifinitura a rasoio”;
  - nota da 500 caratteri.
- **Nomi corti o anonimi:** un nome di una sola lettera (“Jo”), un cliente senza telefono (“Ragazzo con lo zaino rosso”).
- **Quantità estreme:** cliente con 128 visite; rubrica vuota; settimana senza appuntamenti; giorno chiuso.

I dati del caso peggiore sono già nel prototipo: `Taglendo App.dc.html`, Dati → “Peggior caso”.

## Orari
- **Cambio d'ora:** ultima domenica di marzo e di ottobre.
- **Limiti della giornata:**
  - prenotazione che finisce esattamente alla chiusura o all'inizio della pausa;
  - servizio più lungo dello spazio libero rimasto.
- **Preavviso e annullamento al limite:** 1 minuto prima e 1 minuto dopo.
- **Orario conteso:** due prenotazioni simultanee sullo stesso slot.
- **Chiusure dopo la prenotazione:** chiusura inserita dopo che il cliente ha già prenotato.
- **Barbiere disattivato** con appuntamenti futuri.

## Prenotazione del cliente
- **Codice:** errato 5 volte; scaduto; richiesto di nuovo.
- **Email non valida:** errore all'uscita dal campo, non mentre si scrive.
- **Regole cambiate durante la prenotazione:** il salone passa a “solo telefono” o nasconde i prezzi mentre il cliente sta prenotando.
- **Link di gestione:** di un appuntamento passato, annullato o inesistente.

## Abbonamento
- Prova che scade di domenica notte.
- Carta rifiutata, poi aggiornata il giorno 6 di tolleranza.
- Passaggio da Salone a Solo con 3 operatori attivi.
- Webhook di Stripe arrivati due volte o in ordine sbagliato.

## Rete
- Offline mentre si salva un appuntamento.
- Sessione scaduta a metà di un modulo.
- Errore di rete alla conferma del codice: stato “Errore di rete” nel prototipo.
