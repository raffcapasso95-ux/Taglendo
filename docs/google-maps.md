# Suggerimenti dell'indirizzo (Google Maps)

Nel primo avvio e in Salone › Pagina del salone il campo «Indirizzo» propone gli indirizzi di Google mentre scrivi.
La chiave resta sul server (`/api/indirizzi`): il browser non la vede mai. Senza chiave il campo funziona come un campo normale.

## Creare la chiave (una volta)
1. Su https://console.cloud.google.com crea un progetto (es. «Taglendo») e attiva la fatturazione.
   Le prime ~10.000 ricerche al mese di Autocomplete sono gratuite.
2. In «API e servizi › Libreria» attiva **Places API (New)**.
3. In «API e servizi › Credenziali» crea una **chiave API** e in «Limitazioni API» lasciale solo **Places API (New)**.
   Non serve la limitazione per sito: la chiave la usa solo il server.

## Metterla su Vercel
Progetto `taglendo` › Settings › Environment Variables: `GOOGLE_MAPS_API_KEY` = la chiave, per Production e Preview
(tipo «Sensitive»). Poi un nuovo deploy (o «Redeploy» dell'ultimo).
