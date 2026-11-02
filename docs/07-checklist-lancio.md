# Checklist di lancio

## Legale e amministrazione
- [ ] Società e P.IVA. Dati societari nel footer (oggi tra parentesi quadre).
- [ ] Testi di privacy, termini e cookie scritti o verificati da un consulente.
- [ ] Accordo di trattamento dati (DPA) con i saloni, accettato alla registrazione.
- [ ] Registro dei trattamenti.
- [ ] Provider di fattura elettronica collegato e provato.

## Tecnica
- [ ] Dominio, HTTPS, `app.` e pagine dei saloni funzionanti.
- [ ] SPF, DKIM e DMARC configurati. Email di prova a Gmail, Outlook e iCloud: niente spam.
- [ ] Stripe in modalità live, webhook di produzione, prezzi IVA inclusa corretti.
- [ ] Backup automatici di Supabase e un ripristino provato almeno una volta.
- [ ] Sentry attivo, avvisi via email.
- [ ] Revisione esterna di sicurezza (RLS, chiavi, webhook): 5–10 giornate di uno sviluppatore senior.
- [ ] Test end-to-end verdi su Chrome, Safari iOS e Android.

## Contenuti
- [ ] Foto con licenza al posto di quelle dimostrative.
- [ ] Schermate del sito commerciale rigenerate dall'app vera.
- [ ] Favicon, immagine di anteprima per i social, titoli e descrizioni.

## Beta
- [ ] Da 3 a 5 saloni pilota per 3–4 settimane.
- [ ] Un canale diretto per segnalare problemi (email o WhatsApp).
- [ ] Lista di cosa entra dopo il lancio.
