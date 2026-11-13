-- Taglendo · Ricerca dei saloni: ogni salone ha una posizione e può comparire nell'elenco pubblico.

alter table public.salons
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180),
  add column city text check (char_length(city) <= 80),          -- il comune, es. «Bologna»
  add column listed boolean not null default true,               -- «Compari nella ricerca di Taglendo»
  add constraint salons_position_whole check ((lat is null) = (lng is null));

grant update (lat, lng, city, listed) on public.salons to authenticated;
create index salons_city_idx on public.salons (lower(city)) where deleted_at is null and listed;

-- Un salone compare nella ricerca se: non è eliminato, ha finito il primo avvio, il titolare non l'ha tolto,
-- ha una posizione, almeno un servizio, e la prova o l'abbonamento sono validi.
create function private.is_listed(s public.salons)
returns boolean
language sql stable set search_path = ''
as $$
  select s.deleted_at is null
     and s.listed
     and s.onboarding_step >= 5
     and s.lat is not null
     and (s.sub_status in ('active', 'past_due') or (s.sub_status = 'trialing' and s.trial_ends_at > now()))
     and exists (select 1 from public.services v where v.salon_id = s.id and v.active)
$$;

-- I saloni attorno a un punto, dal più vicino. Solo dati che la pagina del salone mostra già a tutti.
create function public.search_salons(p_lat double precision, p_lng double precision, p_radius_km integer default 30, p_limit integer default 40)
returns table (
  slug text, name text, address text, area text, city text, lat double precision, lng double precision,
  cover_path text, logo_path text, booking_online boolean,
  price_from_cents integer,      -- null se il salone nasconde i prezzi
  services text[],               -- i primi tre servizi del listino
  distance_km double precision,
  next_slot timestamptz          -- il primo orario libero nei prossimi 7 giorni (solo con la prenotazione online)
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'posizione non valida' using errcode = '22023';
  end if;
  if p_radius_km is null or p_radius_km < 1 or p_radius_km > 300 or p_limit is null or p_limit < 1 or p_limit > 60 then
    raise exception 'raggio o limite non validi' using errcode = '22023';
  end if;

  return query
  with near as (
    select s.*,
           2 * 6371 * asin(sqrt(
             power(sin(radians(s.lat - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians(s.lat)) * power(sin(radians(s.lng - p_lng) / 2), 2)
           )) as dist
    from public.salons s
    where private.is_listed(s)
  ),
  picked as (
    select * from near n where n.dist <= p_radius_km order by n.dist, n.name limit p_limit
  )
  select p.slug, p.name, p.address, p.area, p.city, p.lat, p.lng, p.cover_path, p.logo_path, p.booking_online,
         case when p.show_prices then (select min(v.price_cents) from public.services v where v.salon_id = p.id and v.active) end,
         (select array_agg(x.name) from (select v.name from public.services v where v.salon_id = p.id and v.active order by v.sort, v.name limit 3) x),
         round(p.dist::numeric, 1)::double precision,
         case when p.booking_online then (
           select min(f.starts_at)
           from public.free_slots(
             p.id,
             (select v.id from public.services v where v.salon_id = p.id and v.active order by v.duration_min, v.sort limit 1),
             null, (now() at time zone p.timezone)::date, 7, true) f
         ) end
  from picked p
  order by p.dist, p.name;
end
$$;
revoke all on function public.search_salons(double precision, double precision, integer, integer) from public;
grant execute on function public.search_salons(double precision, double precision, integer, integer) to anon, authenticated;

-- Le città con almeno un salone in elenco (per la home, le pagine per città e la sitemap).
create function public.salon_cities()
returns table (city text, salons integer, lat double precision, lng double precision)
language sql stable security definer set search_path = ''
as $$
  select min(s.city), count(*)::int, avg(s.lat), avg(s.lng)
  from public.salons s
  where private.is_listed(s) and s.city is not null
  group by lower(s.city)
  order by count(*) desc, min(s.city)
$$;
revoke all on function public.salon_cities() from public;
grant execute on function public.salon_cities() to anon, authenticated;

-- nuove pagine del sito: nessun salone può prendere questi link
alter table public.salons drop constraint salons_slug_not_reserved;
alter table public.salons add constraint salons_slug_not_reserved check (slug <> all (array[
  'accedi', 'registrati', 'verifica', 'password', 'nuova-password', 'invito', 'primo-avvio', 'pronto',
  'agenda', 'clienti', 'link', 'listino', 'impostazioni', 'profilo', 'salone', 'statistiche', 'notifiche',
  'cerca', 'barbieri', 'per-i-saloni',
  'privacy', 'termini', 'cookie', 'api', 'auth', 'dev', 'admin', 'app', 'www', 'taglendo'
]));
