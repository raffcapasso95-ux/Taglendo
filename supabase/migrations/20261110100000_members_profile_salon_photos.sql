-- Taglendo · ridisegno novembre 2026, passo 6: profilo del barbiere e foto del salone

-- ── Profilo di chi lavora: telefono, colore in agenda, prenotabile online ─────────────────────
-- agenda_color null = il colore dipende dall'ordine delle poltrone (come prima).
alter table public.members
  add column phone text check (char_length(phone) <= 20 and phone ~ '^[0-9+ ]+$'),
  add column agenda_color smallint check (agenda_color between 0 and 3),
  add column bookable_online boolean not null default true;
grant select (phone, agenda_color, bookable_online) on public.members to authenticated;

-- ── Foto del salone: fino a 8, la prima è la copertina ──────────────────────────────────────────
create table public.salon_photos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons on delete cascade,
  path text not null check (char_length(path) <= 200),
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index salon_photos_salon_idx on public.salon_photos (salon_id, sort);
alter table public.salon_photos enable row level security;
create policy salon_photos_select on public.salon_photos for select to authenticated
  using (private.is_member(salon_id));
create policy salon_photos_write on public.salon_photos for all to authenticated
  using (private.is_owner(salon_id)) with check (private.is_owner(salon_id));
revoke all on public.salon_photos from anon;

create function private.salon_photos_limit() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select count(*) from public.salon_photos where salon_id = new.salon_id) >= 8 then
    raise exception 'Al massimo 8 foto' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger salon_photos_limit before insert on public.salon_photos
  for each row execute function private.salon_photos_limit();

-- bucket pubblico in lettura (le foto stanno sulla pagina del salone); scrive solo il titolare, nella cartella del proprio salone
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('salon-photos', 'salon-photos', true, 1572864, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy salon_photos_storage_write on storage.objects for insert to authenticated
  with check (bucket_id = 'salon-photos' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
              and private.is_owner(((storage.foldername(name))[1])::uuid));
create policy salon_photos_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'salon-photos' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and private.is_owner(((storage.foldername(name))[1])::uuid));

-- ── Foto di chi lavora: bucket privato, la cambia la persona stessa o il titolare ──────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos', 'member-photos', false, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy member_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'member-photos' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and private.is_member(((storage.foldername(name))[1])::uuid));
create policy member_photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'member-photos' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
              and (private.is_owner(((storage.foldername(name))[1])::uuid)
                   or (storage.foldername(name))[2] = private.my_member_id(((storage.foldername(name))[1])::uuid)::text));
create policy member_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'member-photos' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and (private.is_owner(((storage.foldername(name))[1])::uuid)
              or (storage.foldername(name))[2] = private.my_member_id(((storage.foldername(name))[1])::uuid)::text));

-- ── Il link rispetta «Prenotabile online» e mostra le foto ─────────────────────────────────────
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
