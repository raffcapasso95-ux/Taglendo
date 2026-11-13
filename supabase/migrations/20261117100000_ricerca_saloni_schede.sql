-- Taglendo · Ricerca dei saloni, schede più ricche (come i grandi portali di prenotazione):
-- per ogni salone i primi servizi con durata e prezzo, e i prossimi orari liberi da toccare.
-- In più i saloni arrivati da poco, per la home.

drop function public.search_salons(double precision, double precision, integer, integer);

create function public.search_salons(p_lat double precision, p_lng double precision, p_radius_km integer default 30, p_limit integer default 40)
returns table (
  slug text, name text, address text, area text, city text, lat double precision, lng double precision,
  cover_path text, logo_path text, booking_online boolean,
  price_from_cents integer,      -- null se il salone nasconde i prezzi
  services jsonb,                -- i primi tre servizi: [{name, duration_min, price_cents|null}]
  distance_km double precision,
  next_slots timestamptz[]       -- fino a 4 orari liberi nei prossimi 7 giorni (solo con la prenotazione online)
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
         coalesce((
           select jsonb_agg(jsonb_build_object('name', x.name, 'duration_min', x.duration_min, 'price_cents', case when p.show_prices then x.price_cents end) order by x.sort, x.name)
           from (select v.name, v.duration_min, v.price_cents, v.sort from public.services v where v.salon_id = p.id and v.active order by v.sort, v.name limit 3) x
         ), '[]'::jsonb),
         round(p.dist::numeric, 1)::double precision,
         case when p.booking_online then (
           select array_agg(t.at order by t.at)
           from (
             select distinct f.starts_at as at
             from public.free_slots(
               p.id,
               (select v.id from public.services v where v.salon_id = p.id and v.active order by v.duration_min, v.sort limit 1),
               null, (now() at time zone p.timezone)::date, 7, true) f
             order by f.starts_at
             limit 4
           ) t
         ) end
  from picked p
  order by p.dist, p.name;
end
$$;
revoke all on function public.search_salons(double precision, double precision, integer, integer) from public;
grant execute on function public.search_salons(double precision, double precision, integer, integer) to anon, authenticated;

-- Gli ultimi saloni arrivati su Taglendo (in elenco), per la home: niente distanza né orari.
create function public.recent_salons(p_limit integer default 8)
returns table (slug text, name text, area text, city text, cover_path text, logo_path text, price_from_cents integer, services text[])
language sql stable security definer set search_path = ''
as $$
  select s.slug, s.name, s.area, s.city, s.cover_path, s.logo_path,
         case when s.show_prices then (select min(v.price_cents) from public.services v where v.salon_id = s.id and v.active) end,
         (select array_agg(x.name) from (select v.name from public.services v where v.salon_id = s.id and v.active order by v.sort, v.name limit 3) x)
  from public.salons s
  where private.is_listed(s)
  order by (s.cover_path is null), s.created_at desc   -- prima chi ha una foto
  limit least(greatest(coalesce(p_limit, 8), 1), 24)
$$;
revoke all on function public.recent_salons(integer) from public;
grant execute on function public.recent_salons(integer) to anon, authenticated;
