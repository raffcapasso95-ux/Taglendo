-- Taglendo · ridisegno novembre 2026, passo 5: orari diversi per ogni giorno, con quante fasce si vuole

-- ── Fasce orarie: una riga per ogni fascia di un giorno ─────────────────────────────────
-- «Pausa pranzo» non esiste più come dato: è lo spazio fra due fasce. opening_hours resta
-- l'interruttore del giorno (aperto/chiuso).
create table public.opening_ranges (
  salon_id uuid not null references public.salons on delete cascade,
  weekday int not null check (weekday between 0 and 6),   -- 0 = domenica
  start_min int not null check (start_min between 0 and 1439),   -- minuti dalla mezzanotte: 540 = 9:00
  end_min int not null check (end_min between 1 and 1440),
  primary key (salon_id, weekday, start_min),
  check (start_min < end_min),
  -- due fasce dello stesso giorno non si sovrappongono (e nemmeno si toccano senza pausa: si uniscono)
  constraint opening_ranges_no_overlap exclude using gist (salon_id with =, weekday with =, int4range(start_min, end_min) with &&),
  foreign key (salon_id, weekday) references public.opening_hours (salon_id, weekday) on delete cascade
);
create index opening_ranges_salon_idx on public.opening_ranges (salon_id, weekday);

alter table public.opening_ranges enable row level security;
create policy opening_ranges_select on public.opening_ranges for select to authenticated
  using (private.is_member(salon_id));
create policy opening_ranges_write on public.opening_ranges for all to authenticated
  using (private.is_owner(salon_id)) with check (private.is_owner(salon_id));
revoke all on public.opening_ranges from anon;

-- travaso dei dati: un giorno aperto con pausa diventa due fasce, senza pausa una sola
insert into public.opening_ranges (salon_id, weekday, start_min, end_min)
select h.salon_id, h.weekday, h.open_min, coalesce(h.break_start_min, h.close_min)
from public.opening_hours h
where not h.closed and h.open_min is not null and h.close_min is not null;

insert into public.opening_ranges (salon_id, weekday, start_min, end_min)
select h.salon_id, h.weekday, h.break_end_min, h.close_min
from public.opening_hours h
where not h.closed and h.open_min is not null and h.close_min is not null and h.break_start_min is not null and h.break_end_min < h.close_min;

-- ── Le funzioni che leggevano orario unico e pausa ────────────────────────────────────────
drop function public.free_slots(uuid, uuid, uuid, date, integer, boolean, uuid, integer);
CREATE OR REPLACE FUNCTION public.free_slots(p_salon uuid, p_service uuid, p_member uuid, p_from date, p_days integer, p_public boolean DEFAULT false, p_exclude uuid DEFAULT NULL::uuid, p_step integer DEFAULT NULL::integer)
 RETURNS TABLE(member_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tz text;
  v_notice int;
  v_advance int;
  v_salon_step int;
  v_duration int;
  v_step int;
  v_today date;
begin
  if p_days is null or p_days < 1 or p_days > 62 then
    raise exception 'p_days deve essere tra 1 e 62' using errcode = '22023';
  end if;
  if not p_public and not private.is_member(p_salon) then
    raise exception 'Non sei un membro di questo salone' using errcode = '42501';
  end if;

  select s.timezone, s.min_notice_min, s.max_advance_days, s.slot_step_min
  into v_tz, v_notice, v_advance, v_salon_step
  from public.salons s
  where s.id = p_salon and s.deleted_at is null;
  if not found then
    return;
  end if;

  select sv.duration_min into v_duration
  from public.services sv
  where sv.id = p_service and sv.salon_id = p_salon and sv.active;
  if not found then
    return;
  end if;

  v_step := coalesce(p_step, case when p_public then v_salon_step else 15 end);
  if v_step < 5 or v_step > 120 then
    raise exception 'p_step deve essere tra 5 e 120' using errcode = '22023';
  end if;
  v_today := (now() at time zone v_tz)::date;

  return query
  with days as (
    select d::date as d from generate_series(p_from, p_from + (p_days - 1), interval '1 day') d
  ),
  hours as (
    select dd.d, r.start_min, r.end_min,
           min(r.start_min) over (partition by dd.d) as first_start   -- la griglia degli orari parte dalla prima fascia del giorno
    from days dd
    join public.opening_hours h
      on h.salon_id = p_salon
     and h.weekday = extract(dow from dd.d)::int
     and not h.closed
    join public.opening_ranges r
      on r.salon_id = p_salon
     and r.weekday = h.weekday
    where not exists (
      select 1 from public.closures c
      where c.salon_id = p_salon and c.member_id is null and dd.d between c.starts_on and c.ends_on
    )
  ),
  staff as (
    select m.id, m.chair_no
    from public.members m
    where m.salon_id = p_salon and m.active and (p_member is null or m.id = p_member)
  ),
  cand as (
    select st.id as member_id, st.chair_no, h.d, t.t as minute
    from hours h
    cross join staff st
    cross join lateral generate_series(
      h.first_start + ((h.start_min - h.first_start + v_step - 1) / v_step) * v_step,
      h.end_min - v_duration,
      v_step
    ) as t(t)
    where not exists (
        select 1 from public.closures c
        where c.salon_id = p_salon and c.member_id = st.id and h.d between c.starts_on and c.ends_on
      )
  ),
  stamped as (
    select c.*,
           (c.d::timestamp + make_interval(mins => c.minute)) as wall,
           (c.d::timestamp + make_interval(mins => c.minute)) at time zone v_tz as at_utc
    from cand c
  )
  select s.member_id, s.at_utc, s.at_utc + make_interval(mins => v_duration)
  from stamped s
  where (s.at_utc at time zone v_tz) = s.wall            -- l'orario locale esiste davvero
    and s.at_utc >= now()
    and (not p_public
         or (s.at_utc >= now() + make_interval(mins => v_notice) and s.d <= v_today + v_advance))
    and not exists (
      select 1 from public.appointments a
      where a.member_id = s.member_id
        and a.status in ('confermato', 'completato')
        and a.id is distinct from p_exclude
        and tstzrange(a.starts_at, a.ends_at) && tstzrange(s.at_utc, s.at_utc + make_interval(mins => v_duration))
    )
  order by s.at_utc, s.chair_no;
end
$function$;
revoke all on function public.free_slots(uuid, uuid, uuid, date, int, boolean, uuid, int) from public, anon;
grant execute on function public.free_slots(uuid, uuid, uuid, date, int, boolean, uuid, int) to authenticated;

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
    'phone', s.phone,
    'description', s.description,
    'instagram', s.instagram,
    'cover_path', s.cover_path,
    'booking_online', s.booking_online,
    'cancel_online', s.cancel_online,
    'show_prices', s.show_prices,
    'cancel_limit_min', s.cancel_limit_min,
    'min_notice_min', s.min_notice_min,
    'max_advance_days', s.max_advance_days,
    'sub_status', s.sub_status,
    'trial_ends_at', s.trial_ends_at,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'duration_min', v.duration_min, 'price_cents', v.price_cents) order by v.sort, v.name)
      from public.services v where v.salon_id = s.id and v.active), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'bio', m.bio, 'photo_path', m.photo_path, 'chair_no', m.chair_no) order by m.chair_no)
      from public.members m where m.salon_id = s.id and m.active), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'closed', h.closed,
                                          'ranges', coalesce((select jsonb_agg(jsonb_build_array(r.start_min, r.end_min) order by r.start_min)
                                                              from public.opening_ranges r where r.salon_id = h.salon_id and r.weekday = h.weekday), '[]'::jsonb)) order by h.weekday)
      from public.opening_hours h where h.salon_id = s.id), '[]'::jsonb)
  )
  from public.salons s
  where s.slug = lower(p_slug) and s.deleted_at is null
$function$;
CREATE OR REPLACE FUNCTION public.booking_by_token(p_token text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'public_code', a.public_code,
    'service_name', a.service_name,
    'duration_min', (select sv.duration_min from public.services sv where sv.id = a.service_id),
    'price_cents', a.price_cents,
    'member_name', (select m.name from public.members m where m.id = a.member_id),
    'member_count', (select count(*) from public.members m where m.salon_id = a.salon_id and m.active),
    'salon', jsonb_build_object(
      'slug', s.slug, 'name', s.name, 'address', s.address, 'area', s.area, 'phone', s.phone,
      'cancel_online', s.cancel_online, 'cancel_limit_min', s.cancel_limit_min, 'show_prices', s.show_prices,
      'booking_online', s.booking_online, 'cancel_email', coalesce((select e.cancellation from public.email_prefs e where e.salon_id = s.id), true),
      'hours', coalesce((select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'closed', h.closed,
                                                              'ranges', coalesce((select jsonb_agg(jsonb_build_array(r.start_min, r.end_min) order by r.start_min)
                                                                                  from public.opening_ranges r where r.salon_id = h.salon_id and r.weekday = h.weekday), '[]'::jsonb)) order by h.weekday)
                         from public.opening_hours h where h.salon_id = s.id), '[]'::jsonb)))
  from public.appointments a
  join public.salons s on s.id = a.salon_id and s.deleted_at is null
  where a.manage_token = p_token
$function$;
CREATE OR REPLACE FUNCTION public.register_salon()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_name text;
  v_email text;
  v_salon uuid;
  v_member uuid;
begin
  if v_user is null then
    raise exception 'Accesso richiesto' using errcode = '28000';
  end if;

  select m.salon_id into v_salon
  from public.members m
  where m.user_id = v_user and m.role = 'owner'
  limit 1;
  if v_salon is not null then
    return v_salon;
  end if;

  select u.email, nullif(btrim(coalesce(u.raw_user_meta_data ->> 'name', '')), '')
  into v_email, v_name
  from auth.users u
  where u.id = v_user and u.email_confirmed_at is not null;
  if not found then
    raise exception 'Email non verificata' using errcode = '28000';
  end if;
  v_name := coalesce(v_name, split_part(v_email, '@', 1));

  -- nome e link sono provvisori: si scelgono al passo 1 del primo avvio
  insert into public.salons (slug, name)
  values ('salone-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8), 'Salone di ' || left(v_name, 50))
  returning id into v_salon;

  insert into public.members (salon_id, user_id, name, role, chair_no)
  values (v_salon, v_user, left(v_name, 40), 'owner', 1)
  returning id into v_member;

  -- orari predefiniti: mar–sab 9:00–19:00, pausa 13:00–14:30, chiuso domenica e lunedì
  insert into public.opening_hours (salon_id, weekday, closed)
  select v_salon, w, w in (0, 1) from generate_series(0, 6) w;
  insert into public.opening_ranges (salon_id, weekday, start_min, end_min)
  select v_salon, w, r.s, r.e from generate_series(2, 6) w, (values (540, 780), (870, 1140)) as r(s, e);
  insert into public.email_prefs (salon_id) values (v_salon);
  insert into public.notification_prefs (member_id) values (v_member);

  return v_salon;
end
$function$;

-- ── Via le colonne vecchie ────────────────────────────────────────────────────────────────
alter table public.opening_hours
  drop column open_min,
  drop column close_min,
  drop column break_start_min,
  drop column break_end_min;

-- ── Salvataggio di tutta la settimana in un colpo solo ────────────────────────────────────
-- p_week: [{"weekday": 2, "closed": false, "ranges": [[540, 780], [870, 1140]]}, …]. Solo il titolare.
-- Le fasce di un giorno chiuso si tengono: riaprendolo ritrova i suoi orari.
create function public.set_week_hours(p_salon uuid, p_week jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  d jsonb;
  r jsonb;
  v_weekday int;
begin
  if not private.is_owner(p_salon) then
    raise exception 'Solo il titolare cambia gli orari' using errcode = '42501';
  end if;
  delete from public.opening_ranges where salon_id = p_salon;
  for d in select * from jsonb_array_elements(p_week) loop
    v_weekday := (d ->> 'weekday')::int;
    insert into public.opening_hours (salon_id, weekday, closed)
    values (p_salon, v_weekday, coalesce((d ->> 'closed')::boolean, false))
    on conflict (salon_id, weekday) do update set closed = excluded.closed;
    for r in select * from jsonb_array_elements(coalesce(d -> 'ranges', '[]'::jsonb)) loop
      insert into public.opening_ranges (salon_id, weekday, start_min, end_min)
      values (p_salon, v_weekday, (r ->> 0)::int, (r ->> 1)::int);
    end loop;
  end loop;
end
$$;
revoke all on function public.set_week_hours(uuid, jsonb) from public, anon;
grant execute on function public.set_week_hours(uuid, jsonb) to authenticated;
