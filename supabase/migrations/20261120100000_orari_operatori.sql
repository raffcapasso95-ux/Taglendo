-- Taglendo · orari diversi per ogni operatore
-- Senza righe in member_hours un operatore segue gli orari del salone. Con le righe ha una settimana sua:
-- per ogni giorno l'interruttore (lavora / non lavora) e le sue fasce. Le assenze di un giorno restano
-- le chiusure con member_id (closures), già lette da free_slots.

create table public.member_hours (
  member_id uuid not null references public.members on delete cascade,
  weekday int not null check (weekday between 0 and 6),   -- 0 = domenica
  salon_id uuid not null references public.salons on delete cascade,
  closed boolean not null default false,
  primary key (member_id, weekday)
);
create index member_hours_salon_idx on public.member_hours (salon_id);

create table public.member_ranges (
  member_id uuid not null,
  weekday int not null,
  salon_id uuid not null references public.salons on delete cascade,
  start_min int not null check (start_min between 0 and 1439),
  end_min int not null check (end_min between 1 and 1440),
  primary key (member_id, weekday, start_min),
  check (start_min < end_min),
  constraint member_ranges_no_overlap exclude using gist (member_id with =, weekday with =, int4range(start_min, end_min) with &&),
  foreign key (member_id, weekday) references public.member_hours (member_id, weekday) on delete cascade
);

alter table public.member_hours enable row level security;
alter table public.member_ranges enable row level security;
create policy member_hours_select on public.member_hours for select to authenticated using (private.is_member(salon_id));
create policy member_hours_write on public.member_hours for all to authenticated using (private.is_owner(salon_id)) with check (private.is_owner(salon_id));
create policy member_ranges_select on public.member_ranges for select to authenticated using (private.is_member(salon_id));
create policy member_ranges_write on public.member_ranges for all to authenticated using (private.is_owner(salon_id)) with check (private.is_owner(salon_id));
revoke all on public.member_hours, public.member_ranges from anon;

-- Salva la settimana di un operatore, o la toglie (p_week null: torna agli orari del salone). Solo il titolare.
-- p_week: [{"weekday": 2, "closed": false, "ranges": [[540, 780], [870, 1140]]}, …] con tutti i sette giorni.
create function public.set_member_week(p_salon uuid, p_member uuid, p_week jsonb)
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
  if not exists (select 1 from public.members m where m.id = p_member and m.salon_id = p_salon) then
    raise exception 'Operatore non trovato' using errcode = '42501';
  end if;
  delete from public.member_hours where member_id = p_member;   -- le fasce seguono (on delete cascade)
  if p_week is null or jsonb_typeof(p_week) <> 'array' then
    return;
  end if;
  for d in select * from jsonb_array_elements(p_week) loop
    v_weekday := (d ->> 'weekday')::int;
    insert into public.member_hours (member_id, weekday, salon_id, closed)
    values (p_member, v_weekday, p_salon, coalesce((d ->> 'closed')::boolean, false));
    for r in select * from jsonb_array_elements(coalesce(d -> 'ranges', '[]'::jsonb)) loop
      insert into public.member_ranges (member_id, weekday, salon_id, start_min, end_min)
      values (p_member, v_weekday, p_salon, (r ->> 0)::int, (r ->> 1)::int);
    end loop;
  end loop;
end
$$;
revoke all on function public.set_member_week(uuid, uuid, jsonb) from public, anon;
grant execute on function public.set_member_week(uuid, uuid, jsonb) to authenticated;

-- ── free_slots: gli orari li decide ogni operatore ──────────────────────────────────────
-- Il salone chiuso (giorno o chiusura di tutto il salone) chiude tutti. Dentro un giorno aperto, ogni
-- operatore usa le sue fasce se ne ha di proprie, altrimenti quelle del salone. La griglia degli orari
-- resta quella della prima fascia del salone, così tutti gli operatori propongono gli stessi minuti.
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
      -- le fasce dell'operatore, se ha una settimana sua (e quel giorno lavora)
      select mr.start_min, mr.end_min
      from public.member_hours mh
      join public.member_ranges mr on mr.member_id = mh.member_id and mr.weekday = mh.weekday
      where mh.member_id = st.id and mh.weekday = od.weekday and not mh.closed
      union all
      -- altrimenti quelle del salone
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
