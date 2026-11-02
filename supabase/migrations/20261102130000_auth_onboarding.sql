-- Taglendo · Fase 1: registrazione, primo avvio e inviti

-- ─────────────────────────────────────────────────────────────
-- Primo avvio: a che passo è il salone (1–4), 5 = finito
-- Alla registrazione non si conoscono ancora telefono e link: il telefono diventa
-- facoltativo finché non si finisce il passo 1 (il controllo di formato resta).
-- ─────────────────────────────────────────────────────────────
alter table public.salons
  add column onboarding_step int not null default 1 check (onboarding_step between 1 and 5);

alter table public.salons alter column phone drop not null;

-- /[slug] non deve coincidere con le rotte del sito (docs/03-schermate-e-percorsi.md)
alter table public.salons add constraint salons_slug_not_reserved check (slug <> all (array[
  'accedi', 'registrati', 'verifica', 'password', 'nuova-password', 'invito', 'primo-avvio', 'pronto',
  'agenda', 'clienti', 'link', 'listino', 'impostazioni', 'profilo',
  'privacy', 'termini', 'cookie', 'api', 'auth', 'dev', 'admin', 'app', 'www', 'taglendo'
]));

-- Il salone demo è già pronto
update public.salons set onboarding_step = 5 where slug = 'barberia-saragozza';

-- ─────────────────────────────────────────────────────────────
-- Il titolare non tocca piano, stato dell’abbonamento e prova: li scrive solo il server
-- (webhook Stripe, service role). Prima la policy lo permetteva.
-- ─────────────────────────────────────────────────────────────
revoke update on public.salons from authenticated;
grant update (
  slug, name, address, area, phone, description, instagram, cover_path,
  booking_online, cancel_online, show_prices,
  min_notice_min, max_advance_days, slot_step_min, cancel_limit_min,
  barbers_see_all, barbers_edit, barbers_contacts,
  vat_number, onboarding_step
) on public.salons to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Il token d’invito non si legge dalla tabella: un barbiere non deve poter
-- accettare l’invito di un collega. Il titolare lo legge da pending_invites().
-- ─────────────────────────────────────────────────────────────
revoke select on public.members from authenticated;
grant select (
  id, salon_id, user_id, name, role, chair_no, bio, photo_path,
  invite_email, invite_expires_at, active
) on public.members to authenticated;

create function public.pending_invites(p_salon uuid)
returns table (member_id uuid, name text, email text, token text, expires_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.name, m.invite_email, m.invite_token, m.invite_expires_at
  from public.members m
  where m.salon_id = p_salon
    and m.user_id is null
    and m.invite_token is not null
    and private.is_owner(p_salon)
  order by m.chair_no
$$;
revoke all on function public.pending_invites(uuid) from public, anon;
grant execute on function public.pending_invites(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Registrazione: crea salone in prova (+15 giorni), titolare e impostazioni di partenza.
-- Si chiama dopo la verifica del codice. Se l’utente ha già un salone lo restituisce.
-- ─────────────────────────────────────────────────────────────
create function public.register_salon()
returns uuid
language plpgsql security definer set search_path = ''
as $$
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
  insert into public.opening_hours (salon_id, weekday, closed, open_min, close_min, break_start_min, break_end_min)
  select v_salon, w, w in (0, 1),
         case when w in (0, 1) then null else 540 end,
         case when w in (0, 1) then null else 1140 end,
         case when w in (0, 1) then null else 780 end,
         case when w in (0, 1) then null else 870 end
  from generate_series(0, 6) w;

  insert into public.email_prefs (salon_id) values (v_salon);
  insert into public.notification_prefs (member_id) values (v_member);

  return v_salon;
end
$$;
revoke all on function public.register_salon() from public, anon;
grant execute on function public.register_salon() to authenticated;

-- Il link è libero? (le pagine dei saloni sono pubbliche, quindi l’esistenza di un link non è un segreto)
create function public.slug_available(p_slug text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.salons s where s.slug = lower(p_slug) and s.deleted_at is null)
$$;
revoke all on function public.slug_available(text) from public, anon;
grant execute on function public.slug_available(text) to authenticated;
