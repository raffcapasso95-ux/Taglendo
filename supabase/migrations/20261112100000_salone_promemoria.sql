-- Taglendo · Sezione «Salone» e promemoria con anticipo a scelta

-- /salone è una pagina del gestionale: nessun salone può prendere quel link.
alter table public.salons drop constraint salons_slug_not_reserved;
alter table public.salons add constraint salons_slug_not_reserved check (slug <> all (array[
  'accedi', 'registrati', 'verifica', 'password', 'nuova-password', 'invito', 'primo-avvio', 'pronto',
  'agenda', 'clienti', 'link', 'listino', 'impostazioni', 'profilo', 'salone', 'statistiche',
  'privacy', 'termini', 'cookie', 'api', 'auth', 'dev', 'admin', 'app', 'www', 'taglendo'
]));

-- Quante ore prima dell'appuntamento parte il promemoria al cliente (prima: sempre alle 18 del giorno prima).
alter table public.email_prefs add column reminder_hours smallint not null default 24
  check (reminder_hours in (2, 4, 12, 24, 48));
