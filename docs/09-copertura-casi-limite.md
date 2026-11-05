# Copertura dei casi limite (docs/06)

Per ogni caso: il test che lo verifica. «Manca» = non ancora coperto.

## Dati
| Caso | Test |
|---|---|
| Nome cliente lungo, nome di una lettera, cliente senza telefono | `e2e/casi-limite.spec.ts` (Dati estremi), `lib/rules/agenda.test.ts` |
| Email da più di 80 caratteri, nota da 500 | `e2e/casi-limite.spec.ts` (nessun overflow orizzontale in rubrica e scheda) |
| Servizio con nome lunghissimo | `lib/rules/agenda.test.ts` (peggior caso del prototipo) |
| Cliente con 128 visite | `supabase/tests/casi_limite.test.ts` |
| Rubrica vuota, giorno chiuso | `e2e/casi-limite.spec.ts`, `lib/rules/agenda.test.ts` |
| Settimana senza appuntamenti | `lib/rules/agenda.test.ts` (giorno vuoto, riepilogo) |

## Orari
| Caso | Test |
|---|---|
| Cambio d'ora (marzo e ottobre) | `supabase/tests/free_slots.test.ts` |
| Fine esatta alla chiusura o alla pausa, servizio troppo lungo | `supabase/tests/free_slots.test.ts` |
| Preavviso e annullamento a 1 minuto dal limite | `supabase/tests/casi_limite.test.ts`, `supabase/tests/manage_booking.test.ts` |
| Orario conteso | `supabase/tests/constraints.test.ts`, `online_booking.test.ts`, `e2e/prenotazione.spec.ts` |
| Chiusura dopo la prenotazione | `supabase/tests/casi_limite.test.ts` (resta confermata, niente nuovi orari), `e2e/listino.spec.ts` (avviso) |
| Barbiere disattivato con appuntamenti futuri | `supabase/tests/casi_limite.test.ts`, `free_slots.test.ts` |

## Prenotazione del cliente
| Caso | Test |
|---|---|
| Codice errato 5 volte, scaduto, richiesto di nuovo | `supabase/tests/online_booking.test.ts`, `e2e/prenotazione.spec.ts` |
| Email non valida: errore all'uscita dal campo | `e2e/casi-limite.spec.ts` |
| Il salone passa a «solo telefono» durante la prenotazione | `e2e/casi-limite.spec.ts`, `online_booking.test.ts` |
| Prezzi nascosti durante la prenotazione | `e2e/prenotazione.spec.ts` |
| Link di gestione passato, annullato o inesistente | `supabase/tests/manage_booking.test.ts`, `e2e/prenotazione.spec.ts` |

## Rete
| Caso | Test |
|---|---|
| Offline mentre si salva un appuntamento | `e2e/offline.spec.ts`, `lib/offline/queue.test.ts` |
| Sessione scaduta a metà di un modulo | `e2e/stati.spec.ts` (finestra «Accedi di nuovo», la pagina sotto non si tocca) |
| Errore di rete alla conferma del codice | `e2e/casi-limite.spec.ts` |

## Abbonamento (Fase 6, non ancora attiva nella beta)
- Prova che scade di domenica notte, carta rifiutata e poi aggiornata, passaggio da Salone a Solo con 3 operatori, webhook doppi o in ordine sbagliato: **manca** (si scrivono con Stripe).
