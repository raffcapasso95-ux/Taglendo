-- Taglendo · gestionale del creatore (/admin)
-- • platform_admins: chi può entrare. Nessuna policy: si legge solo dalle funzioni qui sotto.
-- • Sospensione di un salone: sola lettura per i suoi utenti (nessun salvataggio), pagina pubblica e prenotazioni spente.
-- • «Nascosto dalla ricerca» deciso da Taglendo (separato da «Compari nella ricerca» del salone).
-- • Funzioni admin_*: panoramica, elenco, scheda, azioni di base. Dei clienti finali escono solo conteggi.

-- ── 1. Amministratori ──────────────────────────────────────────────────────────────────
create table public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from anon, authenticated;

create function private.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins a where a.user_id = (select auth.uid()))
$$;

-- La pagina /admin chiede «sono un amministratore?»
create function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select private.is_platform_admin() $$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- ── 2. Stato dei saloni deciso da Taglendo ─────────────────────────────────────────────
alter table public.salons
  add column admin_hidden boolean not null default false,        -- nascosto dalla ricerca da Taglendo
  add column suspended_at timestamptz,                           -- sospeso: sola lettura, pagina e prenotazioni spente
  add column suspended_reason text check (char_length(suspended_reason) <= 300);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons on delete cascade,
  author uuid references auth.users on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index admin_notes_salon_idx on public.admin_notes (salon_id, created_at desc);

create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references public.salons on delete set null,
  admin_id uuid references auth.users on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_salon_idx on public.admin_audit (salon_id, created_at desc);

alter table public.admin_notes enable row level security;
alter table public.admin_audit enable row level security;
revoke all on public.admin_notes, public.admin_audit from anon, authenticated;

-- ── 3. Ricerca e pagina pubblica: i saloni sospesi o nascosti non compaiono ──────────────
create or replace function private.is_listed(s public.salons)
returns boolean
language sql stable set search_path = ''
as $$
  select s.deleted_at is null
     and s.listed
     and not s.admin_hidden
     and s.suspended_at is null
     and s.onboarding_step >= 5
     and s.lat is not null
     and (s.sub_status in ('active', 'past_due') or (s.sub_status = 'trialing' and s.trial_ends_at > now()))
     and exists (select 1 from public.services v where v.salon_id = s.id and v.active)
$$;

-- La pagina pubblica: un salone sospeso non si trova più (come se non esistesse).
alter function public.public_salon(text) set schema private;
alter function private.public_salon(text) rename to public_salon_raw;

create function public.public_salon(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case
    when exists (select 1 from public.salons s where s.slug = p_slug and s.suspended_at is not null) then null
    else private.public_salon_raw(p_slug)
  end
$$;
revoke all on function public.public_salon(text) from public;
grant execute on function public.public_salon(text) to anon, authenticated;
revoke all on function private.public_salon_raw(text) from public, anon, authenticated;

create or replace function public.public_salon_slugs()
returns setof text
language sql stable security definer set search_path = ''
as $$
  select s.slug
  from public.salons s
  where s.deleted_at is null
    and s.suspended_at is null
    and exists (select 1 from public.services v where v.salon_id = s.id and v.active)
  order by s.slug
$$;

-- Prenotazioni online: gli orari di un salone sospeso non esistono (le prenotazioni passano da qui).
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
    and (s.suspended_at is null or not p_public);   -- sospeso: online non si prenota
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

-- ── 4. Sospeso = sola lettura per chi è dentro (lettura libera, nessuna scrittura) ─────────
-- Vale per chi arriva con un accesso (utenti del salone); non per l'amministratore, né per i processi di sistema
-- (webhook, invii programmati), né per i clienti che annullano dal proprio link.
create function private.guard_suspended()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_salon uuid;
begin
  if (select auth.uid()) is null or private.is_platform_admin() then
    return coalesce(new, old);
  end if;
  v_salon := (case when tg_table_name = 'salons' then v_row ->> 'id' else v_row ->> 'salon_id' end)::uuid;
  if exists (select 1 from public.salons s where s.id = v_salon and s.suspended_at is not null) then
    raise exception 'Account sospeso' using errcode = '42501', hint = 'account_sospeso';
  end if;
  return coalesce(new, old);
end
$$;

do $$
declare t text;
begin
  foreach t in array array['salons', 'appointments', 'clients', 'services', 'members', 'closures', 'opening_hours', 'opening_ranges', 'member_hours', 'member_ranges', 'salon_photos', 'email_prefs'] loop
    execute format('create trigger guard_suspended before insert or update or delete on public.%I for each row execute function private.guard_suspended()', t);
  end loop;
end $$;

-- ── 5. Funzioni per il gestionale (solo amministratori) ─────────────────────────────────
create function private.require_admin()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_platform_admin() then
    raise exception 'Non autorizzato' using errcode = '42501';
  end if;
end
$$;

-- Panoramica: numeri e andamento degli ultimi 30 giorni.
create function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'salons', (select count(*) from public.salons where deleted_at is null),
    'new7', (select count(*) from public.salons where deleted_at is null and created_at >= now() - interval '7 days'),
    'new30', (select count(*) from public.salons where deleted_at is null and created_at >= now() - interval '30 days'),
    'trialing', (select count(*) from public.salons where deleted_at is null and suspended_at is null and sub_status = 'trialing' and trial_ends_at > now()),
    'active', (select count(*) from public.salons where deleted_at is null and suspended_at is null and sub_status in ('active', 'past_due')),
    'expired', (select count(*) from public.salons where deleted_at is null and suspended_at is null and (sub_status in ('canceled', 'expired') or (sub_status = 'trialing' and trial_ends_at <= now()))),
    'suspended', (select count(*) from public.salons where deleted_at is null and suspended_at is not null),
    'incomplete', (select count(*) from public.salons where deleted_at is null and onboarding_step < 5),
    'listed', (select count(*) from public.salons s where private.is_listed(s)),
    'hidden', (select count(*) from public.salons where deleted_at is null and admin_hidden),
    'blocked', (select count(*) from public.salons s where s.deleted_at is null and s.onboarding_step >= 5 and (
        not exists (select 1 from public.services v where v.salon_id = s.id and v.active)
        or not exists (select 1 from public.opening_ranges r where r.salon_id = s.id))),
    'members', (select count(*) from public.members where active),
    'clients', (select count(*) from public.clients),
    'appointments', jsonb_build_object(
      'total', (select count(*) from public.appointments),
      'today', (select count(*) from public.appointments where starts_at >= date_trunc('day', now() at time zone 'Europe/Rome') at time zone 'Europe/Rome' and starts_at < (date_trunc('day', now() at time zone 'Europe/Rome') + interval '1 day') at time zone 'Europe/Rome'),
      'd7', (select count(*) from public.appointments where created_at >= now() - interval '7 days'),
      'd30', (select count(*) from public.appointments where created_at >= now() - interval '30 days'),
      'online7', (select count(*) from public.appointments where source = 'online' and created_at >= now() - interval '7 days'),
      'online30', (select count(*) from public.appointments where source = 'online' and created_at >= now() - interval '30 days')),
    'signups', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'n', coalesce(c.n, 0)) order by d.day), '[]'::jsonb)
                from generate_series((now() at time zone 'Europe/Rome')::date - 29, (now() at time zone 'Europe/Rome')::date, interval '1 day') as d(day)
                left join (select (created_at at time zone 'Europe/Rome')::date as day, count(*) as n from public.salons where deleted_at is null group by 1) c on c.day = d.day::date),
    'bookings', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'n', coalesce(c.n, 0), 'online', coalesce(c.o, 0)) order by d.day), '[]'::jsonb)
                from generate_series((now() at time zone 'Europe/Rome')::date - 29, (now() at time zone 'Europe/Rome')::date, interval '1 day') as d(day)
                left join (select (created_at at time zone 'Europe/Rome')::date as day, count(*) as n, count(*) filter (where source = 'online') as o from public.appointments group by 1) c on c.day = d.day::date)
  ) into v;
  return v;
end
$$;

-- Elenco: una riga per salone, con ricerca, filtro per stato, ordinamento e pagine.
create function public.admin_salons(p_q text default null, p_status text default 'all', p_sort text default 'created', p_dir text default 'desc', p_limit int default 25, p_offset int default 0)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_dir text := case when lower(coalesce(p_dir, 'desc')) = 'asc' then 'asc' else 'desc' end;
  v_sort text := case when p_sort in ('name', 'city', 'activity', 'appointments') then p_sort else 'created' end;
begin
  perform private.require_admin();
  return (
    with base as (
      select s.id, s.slug, s.name, s.city, s.created_at, s.plan, s.sub_status, s.trial_ends_at, s.onboarding_step,
             s.listed, s.admin_hidden, s.suspended_at,
             (select m.name from public.members m where m.salon_id = s.id and m.role = 'owner' order by m.chair_no limit 1) as owner_name,
             (select u.email from public.members m join auth.users u on u.id = m.user_id where m.salon_id = s.id and m.role = 'owner' order by m.chair_no limit 1) as owner_email,
             (select count(*) from public.members m where m.salon_id = s.id and m.active) as members,
             (select count(*) from public.services v where v.salon_id = s.id and v.active) as services,
             (select count(*) from public.appointments a where a.salon_id = s.id) as appts,
             (select count(*) from public.appointments a where a.salon_id = s.id and a.created_at >= now() - interval '30 days') as appts30,
             (select max(a.created_at) from public.appointments a where a.salon_id = s.id) as last_activity,
             (case
                when s.suspended_at is not null then 'suspended'
                when s.onboarding_step < 5 then 'incomplete'
                when s.sub_status = 'trialing' and s.trial_ends_at > now() then 'trialing'
                when s.sub_status in ('active', 'past_due') then 'active'
                else 'expired' end) as state
      from public.salons s
      where s.deleted_at is null
    ),
    filtered as (
      select * from base b
      where (v_q is null
             or b.name ilike '%' || v_q || '%' or coalesce(b.city, '') ilike '%' || v_q || '%' or b.slug ilike '%' || v_q || '%'
             or coalesce(b.owner_name, '') ilike '%' || v_q || '%' or coalesce(b.owner_email, '') ilike '%' || v_q || '%')
        and (coalesce(p_status, 'all') = 'all'
             or (p_status = 'hidden' and b.admin_hidden)
             or (p_status = 'blocked' and b.onboarding_step >= 5 and b.services = 0)
             or b.state = p_status)
    )
    select jsonb_build_object(
      'total', (select count(*) from filtered),
      'rows', coalesce((
        select jsonb_agg(to_jsonb(r)) from (
          select * from filtered
          order by
            case when v_sort = 'name' and v_dir = 'asc' then lower(name) end asc,
            case when v_sort = 'name' and v_dir = 'desc' then lower(name) end desc,
            case when v_sort = 'city' and v_dir = 'asc' then lower(coalesce(city, '')) end asc,
            case when v_sort = 'city' and v_dir = 'desc' then lower(coalesce(city, '')) end desc,
            case when v_sort = 'activity' and v_dir = 'asc' then coalesce(last_activity, 'epoch'::timestamptz) end asc,
            case when v_sort = 'activity' and v_dir = 'desc' then coalesce(last_activity, 'epoch'::timestamptz) end desc,
            case when v_sort = 'appointments' and v_dir = 'asc' then appts end asc,
            case when v_sort = 'appointments' and v_dir = 'desc' then appts end desc,
            case when v_sort = 'created' and v_dir = 'asc' then created_at end asc,
            created_at desc
          limit v_limit offset v_offset
        ) r), '[]'::jsonb)
    )
  );
end
$$;

-- Scheda di un salone: tutto tranne i dati personali dei clienti finali (solo conteggi).
create function public.admin_salon(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  s public.salons;
begin
  perform private.require_admin();
  select * into s from public.salons where id = p_id and deleted_at is null;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'salon', jsonb_build_object(
      'id', s.id, 'slug', s.slug, 'name', s.name, 'address', s.address, 'area', s.area, 'city', s.city, 'phone', s.phone,
      'description', s.description, 'instagram', s.instagram, 'plan', s.plan, 'sub_status', s.sub_status, 'trial_ends_at', s.trial_ends_at,
      'created_at', s.created_at, 'onboarding_step', s.onboarding_step, 'listed', s.listed, 'admin_hidden', s.admin_hidden,
      'suspended_at', s.suspended_at, 'suspended_reason', s.suspended_reason, 'booking_online', s.booking_online,
      'lat', s.lat, 'lng', s.lng, 'timezone', s.timezone, 'min_notice_min', s.min_notice_min, 'max_advance_days', s.max_advance_days,
      'slot_step_min', s.slot_step_min, 'public', private.is_listed(s)),
    'members', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'name', m.name, 'role', m.role, 'chair_no', m.chair_no, 'active', m.active, 'accepted', m.user_id is not null,
        'email', coalesce(u.email, m.invite_email), 'bookable_online', m.bookable_online) order by m.chair_no)
      from public.members m left join auth.users u on u.id = m.user_id where m.salon_id = s.id), '[]'::jsonb),
    'services', coalesce((select jsonb_agg(jsonb_build_object('name', v.name, 'duration_min', v.duration_min, 'price_cents', v.price_cents, 'active', v.active) order by v.sort, v.name)
      from public.services v where v.salon_id = s.id), '[]'::jsonb),
    'hours', coalesce((select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'closed', h.closed,
        'ranges', coalesce((select jsonb_agg(jsonb_build_array(r.start_min, r.end_min) order by r.start_min) from public.opening_ranges r where r.salon_id = s.id and r.weekday = h.weekday), '[]'::jsonb)) order by h.weekday)
      from public.opening_hours h where h.salon_id = s.id), '[]'::jsonb),
    'counts', jsonb_build_object(
      'clients', (select count(*) from public.clients c where c.salon_id = s.id),
      'appointments', (select count(*) from public.appointments a where a.salon_id = s.id),
      'upcoming', (select count(*) from public.appointments a where a.salon_id = s.id and a.status = 'confermato' and a.starts_at >= now()),
      'last30', (select count(*) from public.appointments a where a.salon_id = s.id and a.created_at >= now() - interval '30 days'),
      'online', (select count(*) from public.appointments a where a.salon_id = s.id and a.source = 'online'),
      'online30', (select count(*) from public.appointments a where a.salon_id = s.id and a.source = 'online' and a.created_at >= now() - interval '30 days'),
      'cancelled', (select count(*) from public.appointments a where a.salon_id = s.id and a.status = 'annullato'),
      'no_show', (select count(*) from public.appointments a where a.salon_id = s.id and a.status = 'non_presentato')),
    'last_activity', (select max(a.created_at) from public.appointments a where a.salon_id = s.id),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'body', n.body, 'created_at', n.created_at, 'author', u.email) order by n.created_at desc)
      from public.admin_notes n left join auth.users u on u.id = n.author where n.salon_id = s.id), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(t.entry order by t.at desc) from (
        select jsonb_build_object('action', a.action, 'details', a.details, 'created_at', a.created_at, 'admin', u.email) as entry, a.created_at as at
        from public.admin_audit a left join auth.users u on u.id = a.admin_id where a.salon_id = s.id order by a.created_at desc limit 30) t), '[]'::jsonb)
  );
end
$$;

-- Azioni di base: ognuna lascia una riga nel registro.
create function private.admin_log(p_salon uuid, p_action text, p_details jsonb)
returns void
language sql security definer set search_path = ''
as $$ insert into public.admin_audit (salon_id, admin_id, action, details) values (p_salon, (select auth.uid()), p_action, coalesce(p_details, '{}'::jsonb)) $$;

create function public.admin_set_hidden(p_id uuid, p_hidden boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.salons set admin_hidden = p_hidden where id = p_id and deleted_at is null;
  if not found then raise exception 'Salone non trovato' using errcode = 'P0002'; end if;
  perform private.admin_log(p_id, case when p_hidden then 'nascosto' else 'mostrato' end, jsonb_build_object('reason', left(p_reason, 300)));
end
$$;

create function public.admin_set_suspended(p_id uuid, p_suspended boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_suspended and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Scrivi il motivo della sospensione' using errcode = '22023';
  end if;
  update public.salons
     set suspended_at = case when p_suspended then now() else null end,
         suspended_reason = case when p_suspended then left(btrim(p_reason), 300) else null end
   where id = p_id and deleted_at is null;
  if not found then raise exception 'Salone non trovato' using errcode = 'P0002'; end if;
  perform private.admin_log(p_id, case when p_suspended then 'sospeso' else 'riattivato' end, jsonb_build_object('reason', left(p_reason, 300)));
end
$$;

create function public.admin_extend_trial(p_id uuid, p_days int, p_reason text default null)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_until timestamptz;
begin
  perform private.require_admin();
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'I giorni vanno da 1 a 365' using errcode = '22023';
  end if;
  update public.salons
     set trial_ends_at = greatest(now(), trial_ends_at) + make_interval(days => p_days),
         sub_status = case when sub_status in ('expired', 'canceled') then 'trialing' else sub_status end
   where id = p_id and deleted_at is null
   returning trial_ends_at into v_until;
  if not found then raise exception 'Salone non trovato' using errcode = 'P0002'; end if;
  perform private.admin_log(p_id, 'prova_prolungata', jsonb_build_object('days', p_days, 'until', v_until, 'reason', left(p_reason, 300)));
  return v_until;
end
$$;

create function public.admin_add_note(p_id uuid, p_body text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  if nullif(btrim(coalesce(p_body, '')), '') is null or char_length(p_body) > 1000 then
    raise exception 'La nota va da 1 a 1000 caratteri' using errcode = '22023';
  end if;
  if not exists (select 1 from public.salons where id = p_id and deleted_at is null) then
    raise exception 'Salone non trovato' using errcode = 'P0002';
  end if;
  insert into public.admin_notes (salon_id, author, body) values (p_id, (select auth.uid()), btrim(p_body));
  perform private.admin_log(p_id, 'nota', '{}'::jsonb);
end
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_overview()', 'public.admin_salons(text, text, text, text, int, int)', 'public.admin_salon(uuid)',
    'public.admin_set_hidden(uuid, boolean, text)', 'public.admin_set_suspended(uuid, boolean, text)',
    'public.admin_extend_trial(uuid, int, text)', 'public.admin_add_note(uuid, text)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke all on function private.require_admin(), private.admin_log(uuid, text, jsonb), private.guard_suspended() from public, anon;
