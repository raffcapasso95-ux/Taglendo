-- Taglendo · Ricerca per servizio, città e data (come i portali di prenotazione).
-- find_salons riceve anche il servizio cercato (testo, es. «barba») e il giorno (facoltativi).
-- La vecchia search_salons non la usa più nessuno: si toglie.

drop function public.search_salons(double precision, double precision, integer, integer);

-- La versione a 4 parametri resta finché il nuovo codice non è online; questa ne ha 6 (senza valori predefiniti
-- sugli ultimi due, così le chiamate vecchie trovano sempre l'altra).
create function public.find_salons(
  p_lat double precision, p_lng double precision, p_radius_km integer, p_limit integer,
  p_service text,   -- null = qualsiasi servizio; altrimenti parte del nome (es. «barba» trova «Barba», «Taglio e barba»)
  p_date date       -- null = i prossimi 7 giorni; altrimenti solo quel giorno, e solo saloni con posto
)
returns table (
  slug text, name text, address text, area text, city text, lat double precision, lng double precision,
  cover_path text, logo_path text, booking_online boolean,
  price_from_cents integer,      -- del servizio cercato (o di tutto il listino); null se i prezzi sono nascosti
  services jsonb,                -- fino a tre servizi, prima quelli cercati: [{name, duration_min, price_cents|null}]
  distance_km double precision,
  next_slots timestamptz[]       -- fino a 4 orari liberi per il servizio cercato (solo con la prenotazione online)
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_term text := nullif(lower(btrim(p_service)), '');
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'posizione non valida' using errcode = '22023';
  end if;
  if p_radius_km is null or p_radius_km < 1 or p_radius_km > 300 or p_limit is null or p_limit < 1 or p_limit > 60 then
    raise exception 'raggio o limite non validi' using errcode = '22023';
  end if;
  if char_length(v_term) > 40 then
    raise exception 'servizio troppo lungo' using errcode = '22023';
  end if;
  if p_date is not null and (p_date < current_date - 1 or p_date > current_date + 62) then
    raise exception 'data fuori misura' using errcode = '22023';
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
      -- con un servizio cercato: solo chi lo fa
      and (v_term is null or exists (
        select 1 from public.services v where v.salon_id = s.id and v.active and position(v_term in lower(v.name)) > 0))
  ),
  inrange as (
    select n.*,
           -- il servizio per gli orari: il più breve tra quelli cercati (o del listino)
           (select v.id from public.services v
             where v.salon_id = n.id and v.active and (v_term is null or position(v_term in lower(v.name)) > 0)
             order by v.duration_min, v.sort limit 1) as svc,
           (now() at time zone n.timezone)::date as today
    from near n
    where n.dist <= p_radius_km
  ),
  slotted as (
    select r.*,
           case when r.booking_online then (
             select array_agg(t.at order by t.at)
             from (
               select distinct f.starts_at as at
               from public.free_slots(r.id, r.svc, null, coalesce(p_date, r.today), case when p_date is null then 7 else 1 end, true) f
               order by f.starts_at
               limit 4
             ) t
           ) end as slots
    from inrange r
    where p_date is null or p_date >= r.today
  ),
  picked as (
    select * from slotted x
    -- con un giorno scelto: solo chi ha posto quel giorno
    where p_date is null or x.slots is not null
    order by x.dist, x.name
    limit p_limit
  )
  select p.slug, p.name, p.address, p.area, p.city, p.lat, p.lng, p.cover_path, p.logo_path, p.booking_online,
         case when p.show_prices then (
           select min(v.price_cents) from public.services v
           where v.salon_id = p.id and v.active and (v_term is null or position(v_term in lower(v.name)) > 0)) end,
         coalesce((
           select jsonb_agg(jsonb_build_object('name', x.name, 'duration_min', x.duration_min, 'price_cents', case when p.show_prices then x.price_cents end) order by x.hit desc, x.sort, x.name)
           from (
             select v.name, v.duration_min, v.price_cents, v.sort,
                    (v_term is not null and position(v_term in lower(v.name)) > 0) as hit
             from public.services v where v.salon_id = p.id and v.active
             order by (v_term is not null and position(v_term in lower(v.name)) > 0) desc, v.sort, v.name
             limit 3
           ) x
         ), '[]'::jsonb),
         round(p.dist::numeric, 1)::double precision,
         p.slots
  from picked p
  order by p.dist, p.name;
end
$$;
revoke all on function public.find_salons(double precision, double precision, integer, integer, text, date) from public;
grant execute on function public.find_salons(double precision, double precision, integer, integer, text, date) to anon, authenticated;

-- I nomi dei servizi più diffusi tra i saloni in elenco (per i suggerimenti del campo «Servizio»).
create function public.service_names(p_limit integer default 12)
returns table (name text, salons integer)
language sql stable security definer set search_path = ''
as $$
  select min(v.name), count(distinct v.salon_id)::int
  from public.services v
  join public.salons s on s.id = v.salon_id
  where v.active and private.is_listed(s)
  group by lower(v.name)
  order by count(distinct v.salon_id) desc, min(v.name)
  limit least(greatest(coalesce(p_limit, 12), 1), 40)
$$;
revoke all on function public.service_names(integer) from public;
grant execute on function public.service_names(integer) to anon, authenticated;
