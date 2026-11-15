-- Taglendo · Ridisegno del sito (novembre 2026), design/ridisegno-sito-2026-11/IMPLEMENTAZIONE.md §8
-- 1. «Da sapere» del salone (campi facoltativi, li scrive il titolare)
-- 2. Ricerca con i filtri (aperto ora, liberi oggi, fascia oraria, servizi, nuovi, ordinamento)
-- 3. Città nella home: barberie e quante hanno posto oggi / domani
-- 4. «Appena arrivate»: solo in ordine di arrivo
-- 5. La vecchia find_salons a 4 parametri non la usa più nessuno: si toglie.

-- ── 1. «Da sapere» ──────────────────────────────────────────────────────────────────────
alter table public.salons
  add column specialties text check (char_length(specialties) <= 120),
  add column payment_methods text[] not null default '{}'
    check (payment_methods <@ array['contanti', 'carta', 'bancomat', 'satispay']::text[]),
  add column products text check (char_length(products) <= 80),
  add column kids_until int check (kids_until between 1 and 17),
  add column step_free_access boolean,
  add column access_note text check (char_length(access_note) <= 60);

-- li cambia il titolare (la policy di update dei saloni vale solo per lui)
grant update (specialties, payment_methods, products, kids_until, step_free_access, access_note)
  on public.salons to authenticated;

-- La pagina pubblica legge anche la città e i campi «Da sapere».
CREATE OR REPLACE FUNCTION public.public_salon(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', s.id,
    'slug', s.slug,
    'name', s.name,
    'address', s.address,
    'area', s.area,
    'city', s.city,
    'phone', s.phone,
    'description', s.description,
    'instagram', s.instagram,
    'cover_path', s.cover_path,
    'logo_path', s.logo_path,
    'booking_online', s.booking_online,
    'cancel_online', s.cancel_online,
    'show_prices', s.show_prices,
    'cancel_limit_min', s.cancel_limit_min,
    'min_notice_min', s.min_notice_min,
    'max_advance_days', s.max_advance_days,
    'sub_status', s.sub_status,
    'trial_ends_at', s.trial_ends_at,
    'specialties', s.specialties,
    'payment_methods', to_jsonb(s.payment_methods),
    'products', s.products,
    'kids_until', s.kids_until,
    'step_free_access', s.step_free_access,
    'access_note', s.access_note,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'duration_min', v.duration_min, 'price_cents', v.price_cents) order by v.sort, v.name)
      from public.services v where v.salon_id = s.id and v.active), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'bio', m.bio, 'photo_path', m.photo_path, 'chair_no', m.chair_no) order by m.chair_no)
      from public.members m where m.salon_id = s.id and m.active and m.bookable_online), '[]'::jsonb),
    'photos', coalesce((
      select jsonb_agg(ph.path order by ph.sort, ph.created_at)
      from public.salon_photos ph where ph.salon_id = s.id), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'closed', h.closed,
                                          'ranges', coalesce((select jsonb_agg(jsonb_build_array(r.start_min, r.end_min) order by r.start_min)
                                                              from public.opening_ranges r where r.salon_id = h.salon_id and r.weekday = h.weekday), '[]'::jsonb)) order by h.weekday)
      from public.opening_hours h where h.salon_id = s.id), '[]'::jsonb)
  )
  from public.salons s
  where s.slug = lower(p_slug) and s.deleted_at is null
$function$;

-- ── 2. Ricerca con i filtri ─────────────────────────────────────────────────────────────

-- Se il salone è aperto adesso: il minuto (dalla mezzanotte, ora del salone) in cui chiude la fascia in corso; altrimenti null.
-- Conta gli orari della settimana e le chiusure di tutto il salone (ferie, festività).
create function private.closes_at_min(p_salon uuid, p_tz text)
returns int
language sql stable set search_path = ''
as $$
  with here as (
    select (now() at time zone p_tz) as t
  )
  select r.end_min
  from here, public.opening_hours h
  join public.opening_ranges r on r.salon_id = h.salon_id and r.weekday = h.weekday
  where h.salon_id = p_salon
    and not h.closed
    and h.weekday = extract(dow from here.t)::int
    and (extract(hour from here.t) * 60 + extract(minute from here.t))::int >= r.start_min
    and (extract(hour from here.t) * 60 + extract(minute from here.t))::int < r.end_min
    and not exists (
      select 1 from public.closures c
      where c.salon_id = p_salon and c.member_id is null and here.t::date between c.starts_on and c.ends_on)
  limit 1
$$;

-- Come la versione a 6 parametri, più i filtri della barra (tutti facoltativi), in un oggetto:
--   services   text[]   ogni voce deve comparire nel nome di almeno un servizio (es. ["barba","bambin"])
--   open_now   boolean  solo i saloni aperti adesso
--   free_today boolean  solo chi ha posto oggi (gli orari mostrati sono quelli di oggi)
--   band       text     mattina (prima delle 13) | pomeriggio (13–18) | sera (dalle 18): solo orari in quella fascia
--   is_new     boolean  solo i saloni arrivati da 30 giorni o meno
--   sort       text     km (predefinito) | first (primo orario libero)
-- La distanza massima è p_radius_km.
create function public.find_salons(
  p_lat double precision, p_lng double precision, p_radius_km integer, p_limit integer,
  p_service text, p_date date, p_filters jsonb
)
returns table (
  slug text, name text, address text, area text, city text, lat double precision, lng double precision,
  cover_path text, logo_path text, booking_online boolean,
  price_from_cents integer,
  services jsonb,                -- fino a tre servizi, prima quelli cercati: [{name, duration_min, price_cents|null}]
  distance_km double precision,
  next_slots timestamptz[],      -- fino a 4 orari liberi (nella fascia scelta), solo con la prenotazione online
  open_now boolean,
  closes_min integer,            -- se aperto: quando chiude la fascia in corso (minuti dalla mezzanotte)
  is_new boolean,
  barbers integer                -- barbieri prenotabili online
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_term text := nullif(lower(btrim(p_service)), '');
  v_f jsonb := coalesce(p_filters, '{}'::jsonb);
  v_terms text[];
  v_open boolean := coalesce((v_f->>'open_now')::boolean, false);
  v_today_only boolean := coalesce((v_f->>'free_today')::boolean, false);
  v_band text := nullif(v_f->>'band', '');
  v_new boolean := coalesce((v_f->>'is_new')::boolean, false);
  v_sort text := coalesce(nullif(v_f->>'sort', ''), 'km');
  v_lo int;
  v_hi int;
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
  if jsonb_typeof(v_f) <> 'object' then
    raise exception 'filtri non validi' using errcode = '22023';
  end if;
  if v_band is not null and v_band not in ('mattina', 'pomeriggio', 'sera') then
    raise exception 'fascia non valida' using errcode = '22023';
  end if;
  if v_sort not in ('km', 'first') then
    raise exception 'ordinamento non valido' using errcode = '22023';
  end if;
  if jsonb_typeof(v_f->'services') = 'array' then
    select coalesce(array_agg(distinct t), '{}') into v_terms
    from (select nullif(lower(btrim(x)), '') as t from jsonb_array_elements_text(v_f->'services') x) y
    where t is not null;
    if cardinality(v_terms) > 8 or exists (select 1 from unnest(v_terms) t where char_length(t) > 40) then
      raise exception 'servizi non validi' using errcode = '22023';
    end if;
  else
    v_terms := '{}';
  end if;
  v_lo := case v_band when 'mattina' then 0 when 'pomeriggio' then 780 when 'sera' then 1080 end;
  v_hi := case v_band when 'mattina' then 780 when 'pomeriggio' then 1080 when 'sera' then 1440 end;

  return query
  with near as (
    select s.*,
           2 * 6371 * asin(sqrt(
             power(sin(radians(s.lat - p_lat) / 2), 2)
             + cos(radians(p_lat)) * cos(radians(s.lat)) * power(sin(radians(s.lng - p_lng) / 2), 2)
           )) as dist
    from public.salons s
    where private.is_listed(s)
      and (v_term is null or exists (
        select 1 from public.services v where v.salon_id = s.id and v.active and position(v_term in lower(v.name)) > 0))
      -- ogni servizio scelto nei filtri: almeno un servizio attivo che lo contiene nel nome
      and not exists (
        select 1 from unnest(v_terms) t
        where not exists (select 1 from public.services v where v.salon_id = s.id and v.active and position(t in lower(v.name)) > 0))
      and (not v_new or s.created_at >= now() - interval '30 days')
  ),
  inrange as (
    select n.*,
           (select v.id from public.services v
             where v.salon_id = n.id and v.active and (v_term is null or position(v_term in lower(v.name)) > 0)
             order by v.duration_min, v.sort limit 1) as svc,
           (now() at time zone n.timezone)::date as today,
           private.closes_at_min(n.id, n.timezone) as closes
    from near n
    where n.dist <= p_radius_km
  ),
  slotted as (
    select r.*,
           case when r.booking_online then (
             select array_agg(t.at order by t.at)
             from (
               select distinct f.starts_at as at
               from public.free_slots(
                      r.id, r.svc, null,
                      case when v_today_only then r.today else coalesce(p_date, r.today) end,
                      case when v_today_only or p_date is not null then 1 else 7 end,
                      true) f
               where v_band is null
                  or (extract(hour from f.starts_at at time zone r.timezone) * 60
                      + extract(minute from f.starts_at at time zone r.timezone))::int >= v_lo
                 and (extract(hour from f.starts_at at time zone r.timezone) * 60
                      + extract(minute from f.starts_at at time zone r.timezone))::int < v_hi
               order by f.starts_at
               limit 4
             ) t
           ) end as slots
    from inrange r
    where (p_date is null or p_date >= r.today)
      and (not v_open or r.closes is not null)
  ),
  picked as (
    select * from slotted x
    -- con un giorno, «liberi oggi» o una fascia: solo chi ha posto
    where (p_date is null and not v_today_only and v_band is null) or x.slots is not null
    order by case when v_sort = 'first' then x.slots[1] end nulls last, x.dist, x.name
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
                    (v_term is not null and position(v_term in lower(v.name)) > 0)
                    or exists (select 1 from unnest(v_terms) t where position(t in lower(v.name)) > 0) as hit
             from public.services v where v.salon_id = p.id and v.active
             order by 5 desc, v.sort, v.name
             limit 3
           ) x
         ), '[]'::jsonb),
         round(p.dist::numeric, 1)::double precision,
         p.slots,
         p.closes is not null,
         p.closes,
         p.created_at >= now() - interval '30 days',
         (select count(*)::int from public.members m where m.salon_id = p.id and m.active and m.bookable_online)
  from picked p
  order by case when v_sort = 'first' then p.slots[1] end nulls last, p.dist, p.name;
end
$$;
revoke all on function public.find_salons(double precision, double precision, integer, integer, text, date, jsonb) from public;
grant execute on function public.find_salons(double precision, double precision, integer, integer, text, date, jsonb) to anon, authenticated;

drop function public.find_salons(double precision, double precision, integer, integer);

-- ── 3. Città nella home ─────────────────────────────────────────────────────────────────
-- Per ogni città con saloni in elenco: quante barberie, quante hanno posto oggi e quante domani.
-- Nessun nome di salone, nessun prezzo.
create function public.city_stats(p_limit integer default 12)
returns table (city text, salons integer, free_today integer, free_tomorrow integer)
language sql stable security definer set search_path = ''
as $$
  with listed as (
    select s.id, s.city, s.booking_online, (now() at time zone s.timezone)::date as today,
           (select v.id from public.services v where v.salon_id = s.id and v.active order by v.duration_min, v.sort limit 1) as svc
    from public.salons s
    where private.is_listed(s) and s.city is not null
  ),
  flags as (
    select l.city,
           l.booking_online and exists (select 1 from public.free_slots(l.id, l.svc, null, l.today, 1, true)) as t0,
           l.booking_online and exists (select 1 from public.free_slots(l.id, l.svc, null, l.today + 1, 1, true)) as t1
    from listed l
  )
  select min(f.city), count(*)::int, count(*) filter (where f.t0)::int, count(*) filter (where f.t1)::int
  from flags f
  group by lower(f.city)
  order by count(*) desc, min(f.city)
  limit least(greatest(coalesce(p_limit, 12), 1), 40)
$$;
revoke all on function public.city_stats(integer) from public;
grant execute on function public.city_stats(integer) to anon, authenticated;

-- ── 4. «Appena arrivate su Taglendo» ────────────────────────────────────────────────────
-- Solo in ordine di arrivo (niente ordinamenti di «qualità»), con il primo posto libero di oggi e i barbieri.
drop function public.recent_salons(integer);
create function public.recent_salons(p_limit integer default 8)
returns table (
  slug text, name text, address text, area text, city text, cover_path text, logo_path text,
  price_from_cents integer, services text[],
  first_today timestamptz,       -- il primo orario libero di oggi (solo con la prenotazione online), o null
  barbers integer
)
language sql stable security definer set search_path = ''
as $$
  select s.slug, s.name, s.address, s.area, s.city, s.cover_path, s.logo_path,
         case when s.show_prices then (select min(v.price_cents) from public.services v where v.salon_id = s.id and v.active) end,
         (select array_agg(x.name) from (select v.name from public.services v where v.salon_id = s.id and v.active order by v.sort, v.name limit 3) x),
         case when s.booking_online then (
           select min(f.starts_at)
           from public.free_slots(
                  s.id,
                  (select v.id from public.services v where v.salon_id = s.id and v.active order by v.duration_min, v.sort limit 1),
                  null, (now() at time zone s.timezone)::date, 1, true) f
         ) end,
         (select count(*)::int from public.members m where m.salon_id = s.id and m.active and m.bookable_online)
  from public.salons s
  where private.is_listed(s)
  order by s.created_at desc, s.name
  limit least(greatest(coalesce(p_limit, 8), 1), 24)
$$;
revoke all on function public.recent_salons(integer) from public;
grant execute on function public.recent_salons(integer) to anon, authenticated;
