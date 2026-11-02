# Schermate e percorsi

I codici si riferiscono a `design/Schermate mancanti.dc.html`. `-D` indica la versione desktop. Per l'app il riferimento principale è `design/Taglendo App.dc.html`.

## Sito commerciale: `taglendo.it`
| Rotta | Design |
|---|---|
| `/` | `Sito Taglendo.dc.html` |
| `/privacy` | G1 |
| `/termini` | G4 |
| `/cookie` | G5 |
| Footer e banner cookie | G2, G3 |

## Accesso: `app.taglendo.it`
| Rotta | Design | Note |
|---|---|---|
| `/accedi` | A1, A1-D | Email, password, Apple, Google, “Ricordami” |
| `/registrati` | A2, A2-D | Nome, email, password con robustezza, accettazione termini |
| `/verifica` | A3, A3-D | Codice di 6 cifre; si conferma da solo; nuovo invio dopo 60 s |
| `/password` | A4, A4-D | Il link vale 30 minuti |
| `/nuova-password` | A5, A5-D | Errore all'uscita dal campo |
| `/invito/[token]` | C7, C7-D | Email precompilata e non modificabile |
| `/primo-avvio/1…4` | A6–A9 (+ -D) | Salone → orari → servizi → poltrone. Su desktop c'è l'anteprima a destra |
| `/pronto` | A10, A10-D | Link da copiare e condividere |

## Gestionale
| Rotta | Design |
|---|---|
| `/agenda` | App: scheda Agenda (griglia, righe, elenco; su telefono: poltrone, lista compatta, griglia) |
| `/clienti`, `/clienti/[id]` | App: scheda Clienti; C12 per esportazione ed eliminazione |
| `/link` | App: scheda Link |
| `/listino` | App: scheda Listino e orari (“Altro” su telefono) |
| `/listino/chiusure` | C2, C3 (+ -D) |
| `/impostazioni` | App: Impostazioni (salone, operatori, promemoria, prenotazioni dei clienti, pagina, abbonamento, avvisi, profilo) |
| `/impostazioni/regole` | C1, C1-D |
| `/impostazioni/operatori` | C4, C4-D; vista operatore C5; limite del piano B7 |
| `/impostazioni/email` | C6, C6-D |
| `/impostazioni/avvisi` | C11, C11-D |
| `/impostazioni/pagina` | C10, C10-D |
| `/impostazioni/abbonamento` | B1 (prova), B5 (attivo), B6 (disdetta), B2 (pagamento) |
| `/profilo` | C8; eliminazione account C9 |
| Stati globali | B3 prova finita · B4 pagamento non riuscito · D1 offline · D2 caricamento · D3 errore · D4 sessione scaduta · D5 notifiche |

**Menu su desktop:** barra laterale **sempre chiusa** a icone (76 px), con le etichette che compaiono al passaggio del mouse. Su telefono la barra è in basso: Agenda, Clienti, Link, Altro.

## Pagina pubblica del salone: `taglendo.it/[slug]`
| Rotta / stato | Design |
|---|---|
| `/[slug]` | `Sito Barberia Saragozza.dc.html` (prenotazione “Una pagina” a fisarmonica; banner cookie; casella privacy) |
| Prenotazione online disattivata | Stesso file, con il comando “Solo telefono”; E6 |
| Prezzi nascosti | Stesso file, con il comando “Nascosti” |
| Dati e privacy al passo 3 | E7 |
| `/[slug]/prenotazione/[token]` | E1 gestione · E2 conferma annullamento · E3 annullata · E4 troppo tardi |
| Link non valido | E5 |
| Preferenze cookie | E8, E9 |

## Email
F1 codice · F2 confermata · F3 promemoria · F4 annullata · F5 invito operatore · F6 spostata.
