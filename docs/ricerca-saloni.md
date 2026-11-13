# Ricerca dei saloni

I clienti cercano una barberia per città o con «Vicino a me», vedono l'elenco con la mappa e aprono la pagina del salone.

## Pagine
| Rotta | Cosa |
|---|---|
| `/` | Home per i clienti: ricerca, città con saloni, come funziona, «Hai un salone?» |
| `/cerca?dove=Bologna` | Elenco dei saloni dal più vicino (entro 30 km; se non c'è niente, i più vicini fino a 150 km) con la mappa |
| `/cerca?lat=&lng=` | Lo stesso, dalla posizione del telefono («Vicino a me») |
| `/barbieri/[città]` | Lo stesso elenco con un indirizzo fisso per Google (in sitemap solo le città con saloni) |
| `/per-i-saloni` | La pagina commerciale per i barbieri (era la home) |

## Chi compare
Un salone compare se: non è eliminato, ha finito il primo avvio, ha una posizione, ha almeno un servizio attivo,
la prova o l'abbonamento sono validi e il titolare non ha spento «Compari nella ricerca di Taglendo»
(Impostazioni › Pagina del salone). Regola in `private.is_listed`, ricerca in `public.search_salons`.
L'elenco mostra solo dati che la pagina del salone mostra già (il prezzo «da» solo se i prezzi sono visibili,
il primo orario solo con la prenotazione online).

## Posizione del salone
Si calcola quando si salva l'indirizzo (primo avvio e pagina del salone), in `lib/places/geocode.ts`:
- con `GOOGLE_MAPS_API_KEY` e la **Geocoding API** attiva sulla chiave: posizione precisa al civico;
- senza: il centro del comune scritto nell'indirizzo («Via Saragozza 48, Bologna»).
Se il comune non si trova il salone non ha posizione e non compare; nelle impostazioni lo spiega.

Per attivare Google: sulla stessa chiave di `docs/google-maps.md` attiva anche **Geocoding API**
(«API e servizi › Libreria») e aggiungila alle «Limitazioni API».

## Comuni e mappa
- Elenco dei comuni: `lib/places/comuni.json`, da GeoNames (https://www.geonames.org, licenza CC BY 4.0).
  Formato: `[nome, provincia, lat, lng, abitanti]`, dal più popoloso.
- Mappa: Leaflet con le mappe di OpenStreetMap (attribuzione nella mappa). Per molto traffico conviene
  passare a un fornitore di mappe con contratto (i server di OpenStreetMap hanno limiti d'uso).
