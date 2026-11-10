-- Taglendo · Festività: il titolare spunta le feste in cui il salone è chiuso, ogni anno.
-- La scelta sta sul salone; le chiusure dei giorni di festa si creano da sole (alla scelta e ogni notte)
-- e sono chiusure come le altre: agenda, orari liberi e prenotazioni online le rispettano già.

alter table public.salons
  add column closed_holidays text[] not null default '{}',
  add column patron_day text check (patron_day ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),  -- «MM-GG»
  add column patron_name text check (char_length(patron_name) between 1 and 60);

grant update (closed_holidays, patron_day, patron_name) on public.salons to authenticated;

-- la chiusura di una festa porta la sua chiave (es. «natale»): si riconosce e non si duplica
alter table public.closures add column holiday text check (holiday ~ '^[a-z_]{2,30}$');
create unique index closures_holiday_once on public.closures (salon_id, holiday, starts_on) where holiday is not null;
