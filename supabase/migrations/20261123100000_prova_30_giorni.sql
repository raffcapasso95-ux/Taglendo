-- Taglendo · la prova ha un valore: 30 giorni dalla registrazione.
-- A prova finita (e senza abbonamento attivo) il salone è «bloccato»: i suoi utenti vedono gli appuntamenti già fissati ma non possono
-- aggiungere né cambiare altro, la pagina pubblica non esiste più e non si prenota online. Vale per i saloni sospesi da Taglendo come prima.

-- 1. Durata della prova: 30 giorni (i saloni già in prova arrivano ai 30 giorni dalla registrazione, mai meno di prima).
alter table public.salons alter column trial_ends_at set default (now() + interval '30 days');
update public.salons
   set trial_ends_at = created_at + interval '30 days'
 where sub_status = 'trialing' and trial_ends_at < created_at + interval '30 days';

-- 2. Lo stato di blocco di un salone: 'suspended' (deciso da Taglendo), 'trial_ended' (prova finita o abbonamento non attivo), altrimenti null.
create function private.salon_lock(p_salon uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select case
    when s.suspended_at is not null then 'suspended'
    when s.sub_status in ('active', 'past_due') then null
    when s.sub_status = 'trialing' and s.trial_ends_at > now() then null
    else 'trial_ended'
  end
  from public.salons s where s.id = p_salon
$$;
revoke all on function private.salon_lock(uuid) from public, anon;
grant execute on function private.salon_lock(uuid) to authenticated;

-- 3. Scritture: bloccate per gli utenti del salone (non per Taglendo né per i processi di sistema).
create or replace function private.guard_suspended()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_salon uuid;
  v_lock text;
begin
  if (select auth.uid()) is null or private.is_platform_admin() then
    return coalesce(new, old);
  end if;
  -- «ho letto le notifiche» non è una modifica del salone
  if tg_table_name = 'members' and tg_op = 'UPDATE' and (to_jsonb(new) - 'activity_seen_at') = (to_jsonb(old) - 'activity_seen_at') then
    return new;
  end if;
  v_salon := (case when tg_table_name = 'salons' then v_row ->> 'id' else v_row ->> 'salon_id' end)::uuid;
  v_lock := private.salon_lock(v_salon);
  if v_lock = 'suspended' then
    raise exception 'Account sospeso' using errcode = '42501', hint = 'account_sospeso';
  elsif v_lock = 'trial_ended' then
    raise exception 'Prova terminata' using errcode = '42501', hint = 'prova_terminata';
  end if;
  return coalesce(new, old);
end
$$;

-- 4. Pagina pubblica, elenco delle pagine e prenotazioni online: un salone bloccato non c'è.
create or replace function public.public_salon(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case
    when exists (select 1 from public.salons s where s.slug = p_slug and private.salon_lock(s.id) is not null) then null
    else private.public_salon_raw(p_slug)
  end
$$;

create or replace function public.public_salon_slugs()
returns setof text
language sql stable security definer set search_path = ''
as $$
  select s.slug
  from public.salons s
  where s.deleted_at is null
    and private.salon_lock(s.id) is null
    and exists (select 1 from public.services v where v.salon_id = s.id and v.active)
  order by s.slug
$$;

create or replace function public.free_slots(p_salon uuid, p_service uuid, p_member uuid, p_from date, p_days integer, p_public boolean default false, p_exclude uuid default null::uuid, p_step integer default null::integer, p_duration integer default null::integer)
 returns table(member_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
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
  where s.id = p_salon and s.deleted_at is null
    and (private.salon_lock(s.id) is null or not p_public);   -- sospeso o prova finita: online non si prenota
  if not found then
    return;
  end if;

  select sv.duration_min into v_duration
  from public.services sv
  where sv.id = p_service and sv.salon_id = p_salon and sv.active;
  if not found then
    return;
  end if;
  if p_duration is not null and not p_public then
    if p_duration < 5 or p_duration > 480 then
      raise exception 'p_duration deve essere tra 5 e 480' using errcode = '22023';
    end if;
    v_duration := p_duration;
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
  open_days as (
    select dd.d, h.weekday,
           (select min(r.start_min) from public.opening_ranges r where r.salon_id = p_salon and r.weekday = h.weekday) as first_start
    from days dd
    join public.opening_hours h
      on h.salon_id = p_salon
     and h.weekday = extract(dow from dd.d)::int
     and not h.closed
    where exists (select 1 from public.opening_ranges r where r.salon_id = p_salon and r.weekday = h.weekday)
      and not exists (
        select 1 from public.closures c
        where c.salon_id = p_salon and c.member_id is null and dd.d between c.starts_on and c.ends_on
      )
  ),
  staff as (
    select m.id, m.chair_no
    from public.members m
    where m.salon_id = p_salon and m.active and (p_member is null or m.id = p_member)
      and (not p_public or m.bookable_online)
  ),
  hours as (
    select od.d, od.first_start, st.id as member_id, st.chair_no, r.start_min, r.end_min
    from open_days od
    cross join staff st
    cross join lateral (
      select mr.start_min, mr.end_min
      from public.member_hours mh
      join public.member_ranges mr on mr.member_id = mh.member_id and mr.weekday = mh.weekday
      where mh.member_id = st.id and mh.weekday = od.weekday and not mh.closed
      union all
      select r.start_min, r.end_min
      from public.opening_ranges r
      where r.salon_id = p_salon and r.weekday = od.weekday
        and not exists (select 1 from public.member_hours mh where mh.member_id = st.id and mh.weekday = od.weekday)
    ) r
  ),
  cand as (
    select h.member_id, h.chair_no, h.d, t.t as minute
    from hours h
    cross join lateral generate_series(
      h.first_start + ceil((h.start_min - h.first_start)::numeric / v_step)::int * v_step,
      h.end_min - v_duration,
      v_step
    ) as t(t)
    where not exists (
        select 1 from public.closures c
        where c.salon_id = p_salon and c.member_id = h.member_id and h.d between c.starts_on and c.ends_on
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
  where (s.at_utc at time zone v_tz) = s.wall
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
