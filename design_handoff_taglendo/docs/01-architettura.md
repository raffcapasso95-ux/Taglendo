# Architettura

## Stack
| Area | Scelta | Note |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Un solo progetto per sito, gestionale e pagine dei saloni |
| Database, accesso | Supabase | PostgreSQL, Auth (email + password, Apple, Google), RLS, Storage per le foto, Edge Functions, `pg_cron` |
| Hosting | Vercel | Anteprima per ogni branch, produzione su `main` |
| Pagamenti | Stripe Billing | Prova di 15 giorni, piani Solo e Salone, Customer Portal per carta e fatture, webhook |
| Fattura elettronica | Provider SDI con API | Si emette sul webhook `invoice.paid` |
| Email | Resend + React Email | Mittente “Barberia X” su dominio Taglendo. SPF/DKIM/DMARC configurati |
| Push | Web Push (VAPID) | Avvisi al barbiere (C11, D5) |
| Errori | Sentry | Client e server |
| Statistiche | Plausible, senza cookie | Sul sito commerciale |
| Test | Vitest + Playwright | |

## Domini
- `taglendo.it`: sito commerciale e pagine pubbliche dei saloni (`taglendo.it/barberia-saragozza`).
- `app.taglendo.it`: gestionale (accesso obbligatorio).

## Struttura delle cartelle (proposta)
```
app/
  (marketing)/            page.tsx, privacy/, termini/, cookie/
  (salon)/[slug]/         page.tsx (pagina pubblica), prenotazione/[token]/
  (auth)/                 accedi/, registrati/, verifica/, password/, nuova-password/, invito/[token]/
  (app)/                  agenda/, clienti/, clienti/[id]/, link/, listino/, listino/chiusure/,
                          impostazioni/(regole|operatori|email|avvisi|pagina|abbonamento)/, profilo/
  primo-avvio/[step]/
  api/stripe/webhook/     route.ts
components/               ui/ (Button, Field, Segmented, Toggle, Card, Sheet, Modal, Toast…), agenda/, booking/
lib/                      supabase/, rules/ (regole pure + test), dates/ (fuso Europe/Rome), stripe/, email/
emails/                   React Email: codice, confermata, promemoria, annullata, spostata, invito
supabase/                 migrations/, seed.sql (dati demo Barberia Saragozza), functions/
tokens/tokens.css
```

## Ambienti
- **Locale:** Supabase CLI con Docker, Stripe CLI per i webhook, chiavi di test.
- **Preview:** progetto Supabase “staging” con Stripe in test.
- **Produzione:** progetto Supabase separato, Stripe live. Si attiva solo al lancio.

## Lavori programmati (cron)
- Ogni 5 minuti invia i promemoria dovuti (alle 18:00 del giorno prima, ora di Roma).
- Ogni giorno alle 8:00 invia il riepilogo della giornata a chi l'ha attivato.
- Ogni ora:
  - pulisce i codici scaduti;
  - controlla le prove in scadenza;
  - controlla gli inviti scaduti (7 giorni).
- Ogni giorno cancella definitivamente gli account eliminati da più di 30 giorni.
