# Checklist di lancio

Legenda: ✅ fatto e verificato · 🟡 fatto in parte · ⬜ da fare · 👤 lo fa il titolare del progetto.
Ultimo controllo: fine Fase 10 (novembre 2026).

## Legale e amministrazione
- ⬜ 👤 Società e P.IVA. Dati societari nel footer (oggi tra parentesi quadre in `lib/site.ts`).
- ⬜ 👤 Testi di privacy, termini e cookie scritti o verificati da un consulente (oggi sono bozze).
- ⬜ 👤 Accordo di trattamento dati (DPA) con i saloni, accettato alla registrazione.
- ⬜ 👤 Registro dei trattamenti.
- ⬜ 👤 Provider di fattura elettronica collegato e provato (serve con i pagamenti, Fase 6).

## Tecnica
- ✅ Dominio e HTTPS: `taglendo.it` e `taglendo.vercel.app`. 🟡 Resta `app.`: oggi gestionale e pagine dei saloni stanno sullo stesso dominio, e va bene per la beta.
- ✅ Email: DKIM di Resend e mittente `send.taglendo.it` presenti. 🟡 DMARC è `p=none` (solo controllo): dopo 2–3 settimane di posta regolare si passa a `quarantine`.
- ⬜ 👤 Email di prova a Gmail, Outlook e iCloud, guardando che non finiscano in spam.
- ⬜ Stripe in modalità live (Fase 6, dopo la beta).
- ⬜ 👤 **Backup**: il progetto Supabase è sul piano gratuito, senza backup automatici né ripristino a un istante. Prima di far entrare dati veri serve il piano Pro (backup giornalieri), oppure un backup periodico gestito da noi. Poi un ripristino provato almeno una volta.
- ✅ Sentry attivo (DSN su Vercel). ⬜ 👤 Avvisi via email da impostare dentro Sentry (Alerts → regola «nuovo errore»).
- 🟡 Sicurezza, controllo interno: tutte le tabelle hanno RLS (verificato anche sul database online), i test di isolamento tra saloni sono verdi, le funzioni chiamabili senza accesso sono solo le due della pagina pubblica, le chiavi segrete stanno solo nelle variabili d'ambiente. ⬜ Revisione esterna (RLS, chiavi, webhook): 5–10 giornate di uno sviluppatore senior.
- ⬜ 👤 Cambiare le chiavi incollate in chat durante lo sviluppo (password del database, chiave segreta Supabase, token di accesso Supabase, chiave Resend, token Sentry) e aggiornarle su Vercel.
- 🟡 Test end-to-end verdi su Chrome (telefono e desktop emulati): 257 passati, 0 falliti, più 280 test unitari e del database. ⬜ 👤 Prova a mano su Safari iOS e su un Android vero: installazione come app, notifiche, offline.
- ✅ Accessibilità: controllo automatico (axe) verde su tutte le pagine principali. ⬜ 👤 Una prova con uno screen reader vero.
- ✅ Velocità: Lighthouse da telefono (fine Fase 10) — pagina del salone 95, registrazione 96, accesso 98, home 82. Accessibilità 100 e best practices 100 ovunque.

## Contenuti
- ⬜ 👤 Foto con licenza al posto di quelle dimostrative.
- ⬜ Schermate del sito commerciale rigenerate dall'app vera.
- ✅ Favicon (logo), immagine di anteprima per i social, titoli e descrizioni.

## Beta
- ⬜ 👤 Da 3 a 5 saloni pilota per 3–4 settimane.
- ✅ Canale diretto per segnalare problemi: in Impostazioni → «Segnala un problema» (apre l'email a `aiuto@taglendo.it`) e il pulsante nelle schermate d'errore. ⬜ 👤 La casella `aiuto@taglendo.it` va creata su Register.
- ✅ Lista di cosa entra dopo il lancio: `docs/10-dopo-il-lancio.md`.
- ✅ Saloni demo per lo staging: `supabase/demo-staging.sql` (1 e 2 poltrone, più Barberia Saragozza con 3).
