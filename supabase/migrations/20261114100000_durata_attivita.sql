-- Taglendo · Durata a scelta per un appuntamento e «Notifiche» (attività del salone)

-- ── 1. free_slots con una durata diversa da quella del listino ─────────────────────────
drop function public.free_slots(uuid, uuid, uuid, date, integer, boolean, uuid, integer);

CREATE FUNCTION public.free_slots(p_salon uuid, p_service uuid, p_member uuid, p_from date, p_days integer, p_public boolean DEFAULT false, p_exclude uuid DEFAULT NULL::uuid, p_step integer DEFAULT NULL::integer, p_duration integer DEFAULT NULL::integer)
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
  -- durata scelta nel gestionale per questo appuntamento (es. 40 minuti invece di 30); il pubblico usa sempre il listino
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
      and (not p_public or m.bookable_online)   -- chi ha spento «Prenotabile online» non compare sul link
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

revoke all on function public.free_slots(uuid, uuid, uuid, date, int, boolean, uuid, int, int) from public, anon;
grant execute on function public.free_slots(uuid, uuid, uuid, date, int, boolean, uuid, int, int) to authenticated;

-- ── 2. Notifiche: cosa è successo agli appuntamenti del salone ─────────────────────────
-- Una riga per ogni fatto (nuovo, prenotato online, spostato, annullato, completato, non presentato),
-- scritta da un trigger: vale per ogni strada (gestionale, prenotazione online, annullamento del cliente).
create table public.activity (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons on delete cascade,
  appointment_id uuid references public.appointments on delete set null,
  member_id uuid,                                   -- il barbiere dell'appuntamento (per chi vede solo i suoi)
  kind text not null check (kind in ('nuovo', 'online', 'spostato', 'annullato', 'completato', 'non_presentato')),
  by_client boolean not null default false,         -- l'ha fatto il cliente (prenotazione o annullamento online)
  actor_name text,                                  -- chi del salone l'ha fatto; null = cliente o sistema
  actor_member_id uuid,
  client_name text,
  service_name text,
  member_name text,
  starts_at timestamptz,
  old_starts_at timestamptz,
  old_member_name text,
  created_at timestamptz not null default clock_timestamp()
);
create index activity_salon_idx on public.activity (salon_id, created_at desc);
alter table public.activity enable row level security;

-- si legge come gli appuntamenti: senza «vedere l'agenda di tutti» il barbiere vede solo i suoi
create policy activity_select on public.activity for select to authenticated
  using (private.is_member(salon_id)
         and (private.can(salon_id, 'see_all') or member_id = private.my_member_id(salon_id)));
revoke all on public.activity from anon;
revoke insert, update, delete on public.activity from authenticated;

-- fin dove ognuno ha letto le notifiche
alter table public.members add column activity_seen_at timestamptz;
grant select (activity_seen_at) on public.members to authenticated;

create function private.log_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_kind text;
  v_actor public.members%rowtype;
  v_client text;
  v_member text;
  v_old_member text;
begin
  if tg_op = 'INSERT' then
    v_kind := case when new.source = 'online' then 'online' else 'nuovo' end;
  elsif new.status is distinct from old.status then
    if new.status = 'confermato' then return new; end if;
    v_kind := new.status::text;
  elsif new.starts_at is distinct from old.starts_at or new.member_id is distinct from old.member_id then
    v_kind := 'spostato';
  else
    return new;
  end if;

  select * into v_actor from public.members m where m.salon_id = new.salon_id and m.user_id = auth.uid() limit 1;
  select c.name into v_client from public.clients c where c.id = new.client_id;
  select m.name into v_member from public.members m where m.id = new.member_id;
  if tg_op = 'UPDATE' and v_kind = 'spostato' and new.member_id is distinct from old.member_id then
    select m.name into v_old_member from public.members m where m.id = old.member_id;
  end if;

  insert into public.activity (salon_id, appointment_id, member_id, kind, by_client, actor_name, actor_member_id,
                               client_name, service_name, member_name, starts_at, old_starts_at, old_member_name)
  values (new.salon_id, new.id, new.member_id, v_kind,
          (v_kind = 'online') or (v_kind = 'annullato' and new.cancelled_by = 'cliente'),
          v_actor.name, v_actor.id, v_client, new.service_name, v_member, new.starts_at,
          case when tg_op = 'UPDATE' and v_kind = 'spostato' then old.starts_at end, v_old_member);
  return new;
end
$$;

create trigger appointments_activity
  after insert or update on public.appointments
  for each row execute function private.log_activity();

-- «Ho letto»: segna le notifiche come viste per chi è collegato, in quel salone
create function public.mark_activity_seen(p_salon uuid)
returns void
language sql security definer set search_path = ''
as $$
  update public.members set activity_seen_at = now()
  where salon_id = p_salon and user_id = auth.uid();
$$;
revoke all on function public.mark_activity_seen(uuid) from public, anon;
grant execute on function public.mark_activity_seen(uuid) to authenticated;

-- /notifiche è una pagina del gestionale: nessun salone può prendere quel link
alter table public.salons drop constraint salons_slug_not_reserved;
alter table public.salons add constraint salons_slug_not_reserved check (slug <> all (array[
  'accedi', 'registrati', 'verifica', 'password', 'nuova-password', 'invito', 'primo-avvio', 'pronto',
  'agenda', 'clienti', 'link', 'listino', 'impostazioni', 'profilo', 'salone', 'statistiche', 'notifiche',
  'privacy', 'termini', 'cookie', 'api', 'auth', 'dev', 'admin', 'app', 'www', 'taglendo'
]));
