-- Taglendo · Fase 2a: orari liberi e codice pubblico degli appuntamenti

-- ─────────────────────────────────────────────────────────────
-- Codice pubblico "TG-4829", generato dal database.
-- security definer: deve vedere i codici di tutti i saloni, non solo quelli del chiamante.
-- Il codice non è un segreto (il segreto è manage_token); in caso di scontro rarissimo
-- tra due inserimenti insieme, il vincolo di unicità fa fallire il secondo.
-- ─────────────────────────────────────────────────────────────
create function private.new_public_code()
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_code text;
  v_try int := 0;
begin
  loop
    v_try := v_try + 1;
    -- 4 cifre; se lo spazio si riempie, passa a 6
    v_code := 'TG-' || lpad(floor(random() * case when v_try <= 30 then 10000 else 1000000 end)::int::text,
                            case when v_try <= 30 then 4 else 6 end, '0');
    exit when not exists (select 1 from public.appointments a where a.public_code = v_code);
  end loop;
  return v_code;
end
$$;
revoke all on function private.new_public_code() from public;
grant execute on function private.new_public_code() to authenticated;

alter table public.appointments alter column public_code set default private.new_public_code();

-- ─────────────────────────────────────────────────────────────
-- free_slots: gli orari in cui un servizio entra per intero.
--
-- Tiene conto di: orari di apertura e pause, chiusure (di tutto il salone o di un barbiere),
-- barbieri attivi, durata del servizio e appuntamenti confermati o completati dello stesso barbiere.
-- Non propone mai orari già passati.
--
-- p_public = false (gestionale): per chi lavora nel salone. Orari ogni 15 minuti, nessun limite
--   di preavviso né di anticipo. Serve essere membro del salone.
-- p_public = true (pagina pubblica): passo e limiti scelti dal salone
--   (slot_step_min, min_notice_min, max_advance_days).
-- p_member null = tutti i barbieri attivi, in ordine di poltrona.
-- p_exclude: un appuntamento da ignorare, per spostarlo.
--
-- Gli orari di apertura sono "ore del muro" nel fuso del salone, quindi nei giorni del cambio d'ora
-- il giorno è lungo 23 o 25 ore. Gli orari che non esistono (2:30 il giorno dell'ora legale) non si propongono.
-- ─────────────────────────────────────────────────────────────
create function public.free_slots(
  p_salon uuid,
  p_service uuid,
  p_member uuid,
  p_from date,
  p_days int,
  p_public boolean default false,
  p_exclude uuid default null,
  p_step int default null
)
returns table (member_id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
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
    select dd.d, h.open_min, h.close_min, h.break_start_min, h.break_end_min
    from days dd
    join public.opening_hours h
      on h.salon_id = p_salon
     and h.weekday = extract(dow from dd.d)::int
     and not h.closed
     and h.open_min is not null
     and h.close_min is not null
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
    cross join lateral generate_series(h.open_min, h.close_min - v_duration, v_step) as t(t)
    where (h.break_start_min is null
           or not (t.t < h.break_end_min and t.t + v_duration > h.break_start_min))
      and not exists (
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
$$;

revoke all on function public.free_slots(uuid, uuid, uuid, date, int, boolean, uuid, int) from public, anon;
grant execute on function public.free_slots(uuid, uuid, uuid, date, int, boolean, uuid, int) to authenticated;
