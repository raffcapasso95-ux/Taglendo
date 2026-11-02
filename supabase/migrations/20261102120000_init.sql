-- Taglendo · migrazione iniziale (Fase 0)
-- Fonte: docs/02-modello-dati.md, con le rifiniture indicate in fondo al file.
-- Orari in timestamptz (UTC), mostrati in Europe/Rome. Prezzi in centesimi.

create extension if not exists btree_gist;

-- ─────────────────────────────────────────────────────────────
-- Tipi
-- ─────────────────────────────────────────────────────────────
create type public.plan_t as enum ('trial', 'solo', 'salone');
create type public.sub_status_t as enum ('trialing', 'active', 'past_due', 'canceled', 'expired');
create type public.role_t as enum ('owner', 'barber');
create type public.appt_status_t as enum ('confermato', 'completato', 'annullato', 'non_presentato');
create type public.appt_source_t as enum ('manuale', 'online', 'in_negozio');

-- ─────────────────────────────────────────────────────────────
-- Tabelle
-- ─────────────────────────────────────────────────────────────
create table public.salons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(name) between 1 and 60),
  address text,
  area text,                                    -- “Porta Saragozza · Bologna”
  phone text not null check (char_length(phone) <= 20 and phone ~ '^[0-9+ ]+$'),
  description text check (char_length(description) <= 160),
  instagram text,
  cover_path text,
  timezone text not null default 'Europe/Rome',
  -- regole per i clienti (docs/04-regole.md)
  booking_online boolean not null default true,
  cancel_online boolean not null default true,
  show_prices boolean not null default true,
  min_notice_min int not null default 120 check (min_notice_min in (30, 120, 1440)),
  max_advance_days int not null default 14 check (max_advance_days in (14, 30, 60)),
  slot_step_min int not null default 15 check (slot_step_min in (15, 30)),
  cancel_limit_min int not null default 120 check (cancel_limit_min in (120, 1440)),
  -- permessi dei barbieri
  barbers_see_all boolean not null default true,
  barbers_edit boolean not null default true,
  barbers_contacts boolean not null default false,
  -- abbonamento: prova di 15 giorni dalla registrazione
  plan public.plan_t not null default 'trial',
  sub_status public.sub_status_t not null default 'trialing',
  trial_ends_at timestamptz not null default (now() + interval '15 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  vat_number text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.members (                  -- operatori = poltrone
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons on delete cascade,
  user_id uuid references auth.users on delete set null,  -- null finché l’invito non è accettato
  name text not null check (char_length(name) between 1 and 40),
  role public.role_t not null default 'barber',
  chair_no int not null check (chair_no between 1 and 3),
  bio text,
  photo_path text,
  invite_email text,
  invite_token text unique,
  invite_expires_at timestamptz,
  active boolean not null default true,
  unique (salon_id, chair_no),
  unique (salon_id, user_id),
  unique (id, salon_id)                         -- per le chiavi composte qui sotto
);
create index members_user_id_idx on public.members (user_id);

create table public.opening_hours (
  salon_id uuid not null references public.salons on delete cascade,
  weekday int not null check (weekday between 0 and 6),   -- 0 = domenica
  closed boolean not null default false,
  open_min int check (open_min between 0 and 1440),       -- minuti dalla mezzanotte: 540 = 9:00
  close_min int check (close_min between 0 and 1440),
  break_start_min int check (break_start_min between 0 and 1440),
  break_end_min int check (break_end_min between 0 and 1440),
  primary key (salon_id, weekday),
  check (closed or (open_min is not null and close_min is not null and open_min < close_min)),
  check ((break_start_min is null) = (break_end_min is null)),
  check (break_start_min is null or (break_start_min < break_end_min
         and break_start_min >= open_min and break_end_min <= close_min))
);

create table public.closures (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons on delete cascade,
  member_id uuid,                               -- null = tutto il salone
  starts_on date not null,
  ends_on date not null,
  note text check (char_length(note) <= 500),
  check (ends_on >= starts_on),
  foreign key (member_id, salon_id) references public.members (id, salon_id) on delete cascade
);
create index closures_salon_idx on public.closures (salon_id, starts_on);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  duration_min int not null check (duration_min between 5 and 240),
  price_cents int not null check (price_cents >= 0),
  active boolean not null default true,
  sort int not null default 0,
  unique (id, salon_id)
);
create index services_salon_idx on public.services (salon_id, sort);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  phone text check (char_length(phone) <= 20 and phone ~ '^[0-9+ ]+$'),
  email text check (char_length(email) <= 254),
  note text check (char_length(note) <= 500),
  privacy_accepted_at timestamptz,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, salon_id)
);
create index clients_salon_name_idx on public.clients (salon_id, lower(name));

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons on delete cascade,
  member_id uuid not null,
  client_id uuid,
  service_id uuid,
  service_name text not null check (char_length(service_name) <= 60),  -- copiati alla prenotazione
  price_cents int not null check (price_cents >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appt_status_t not null default 'confermato',
  source public.appt_source_t not null default 'manuale',
  public_code text unique not null,             -- TG-4829
  manage_token text unique not null              -- link “Gestisci la prenotazione”
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  cancelled_by text check (cancelled_by in ('cliente', 'salone')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((status = 'annullato') = (cancelled_by is not null)),
  -- operatore, cliente e servizio devono essere dello stesso salone
  foreign key (member_id, salon_id) references public.members (id, salon_id),
  foreign key (client_id, salon_id) references public.clients (id, salon_id) on delete set null (client_id),
  foreign key (service_id, salon_id) references public.services (id, salon_id) on delete set null (service_id),
  -- la sovrapposizione la impedisce il database
  constraint appointments_no_overlap
    exclude using gist (member_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status = 'confermato')
);
create index appointments_salon_start_idx on public.appointments (salon_id, starts_at);
create index appointments_client_idx on public.appointments (client_id);

create table public.booking_codes (            -- codice email a 6 cifre
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons on delete cascade,
  email text not null,
  code_hash text not null,
  payload jsonb not null,                       -- servizio, operatore, orario, dati cliente
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  attempts int not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now()
);
create index booking_codes_expires_idx on public.booking_codes (expires_at);

create table public.notification_prefs (
  member_id uuid primary key references public.members on delete cascade,
  new_booking boolean not null default true,
  client_cancel boolean not null default true,
  daily_summary boolean not null default false,
  channel text not null default 'push' check (channel in ('push', 'email', 'both')),
  only_mine boolean not null default false
);

create table public.email_prefs (
  salon_id uuid primary key references public.salons on delete cascade,
  confirmation boolean not null default true,
  reminder boolean not null default true,
  cancellation boolean not null default true
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members on delete cascade,
  endpoint text unique not null,
  keys jsonb not null
);

-- ─────────────────────────────────────────────────────────────
-- Funzioni per le policy (schema private: non esposto dall’API)
-- security definer: leggono members senza ricadere nella RLS di members.
-- ─────────────────────────────────────────────────────────────
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.my_member(p_salon uuid)
returns public.members
language sql stable security definer set search_path = ''
as $$
  select m.* from public.members m
  where m.salon_id = p_salon and m.user_id = (select auth.uid()) and m.active
  limit 1
$$;

create function private.is_member(p_salon uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    join public.salons s on s.id = m.salon_id and s.deleted_at is null
    where m.salon_id = p_salon and m.user_id = (select auth.uid()) and m.active
  )
$$;

create function private.is_owner(p_salon uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    join public.salons s on s.id = m.salon_id and s.deleted_at is null
    where m.salon_id = p_salon and m.user_id = (select auth.uid()) and m.active and m.role = 'owner'
  )
$$;

-- Permessi dei barbieri: il titolare li ha sempre tutti.
-- p_perm: 'see_all' | 'edit' | 'contacts'
create function private.can(p_salon uuid, p_perm text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select m.role = 'owner' or case p_perm
      when 'see_all' then s.barbers_see_all
      when 'edit' then s.barbers_edit
      when 'contacts' then s.barbers_contacts
      else false end
    from public.members m
    join public.salons s on s.id = m.salon_id and s.deleted_at is null
    where m.salon_id = p_salon and m.user_id = (select auth.uid()) and m.active
    limit 1
  ), false)
$$;

create function private.my_member_id(p_salon uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$ select (private.my_member(p_salon)).id $$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS: ogni tabella è limitata al salone dei membri dell’utente.
-- Nessuna policy per anon: la pagina pubblica userà una vista dedicata (Fase 4).
-- ─────────────────────────────────────────────────────────────
alter table public.salons enable row level security;
alter table public.members enable row level security;
alter table public.opening_hours enable row level security;
alter table public.closures enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.booking_codes enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.email_prefs enable row level security;
alter table public.push_subscriptions enable row level security;

-- salons: i membri leggono, solo il titolare modifica.
-- La creazione passa dalla registrazione lato server (Fase 1).
create policy salons_select on public.salons for select to authenticated
  using (private.is_member(id));
create policy salons_update on public.salons for update to authenticated
  using (private.is_owner(id)) with check (private.is_owner(id));

-- members, listino, orari, chiusure, email: leggono i membri, scrive il titolare.
create policy members_select on public.members for select to authenticated
  using (private.is_member(salon_id));
create policy members_write on public.members for all to authenticated
  using (private.is_owner(salon_id)) with check (private.is_owner(salon_id));

create policy opening_hours_select on public.opening_hours for select to authenticated
  using (private.is_member(salon_id));
create policy opening_hours_write on public.opening_hours for all to authenticated
  using (private.is_owner(salon_id)) with check (private.is_owner(salon_id));

create policy closures_select on public.closures for select to authenticated
  using (private.is_member(salon_id));
create policy closures_write on public.closures for all to authenticated
  using (private.is_owner(salon_id)) with check (private.is_owner(salon_id));

create policy services_select on public.services for select to authenticated
  using (private.is_member(salon_id));
create policy services_write on public.services for all to authenticated
  using (private.is_owner(salon_id)) with check (private.is_owner(salon_id));

create policy email_prefs_select on public.email_prefs for select to authenticated
  using (private.is_member(salon_id));
create policy email_prefs_write on public.email_prefs for all to authenticated
  using (private.is_owner(salon_id)) with check (private.is_owner(salon_id));

-- clients: righe visibili a tutti i membri; telefono ed email solo con il permesso
-- (vedi clients_visible). Crea e modifica chi può fissare appuntamenti; elimina il titolare.
create policy clients_select on public.clients for select to authenticated
  using (private.is_member(salon_id));
create policy clients_insert on public.clients for insert to authenticated
  with check (private.can(salon_id, 'edit'));
create policy clients_update on public.clients for update to authenticated
  using (private.can(salon_id, 'edit')) with check (private.can(salon_id, 'edit'));
create policy clients_delete on public.clients for delete to authenticated
  using (private.is_owner(salon_id));

-- appointments: senza “vedere l’agenda di tutti” il barbiere vede e tocca solo i suoi.
create policy appointments_select on public.appointments for select to authenticated
  using (private.is_member(salon_id)
         and (private.can(salon_id, 'see_all') or member_id = private.my_member_id(salon_id)));
create policy appointments_insert on public.appointments for insert to authenticated
  with check (private.can(salon_id, 'edit')
              and (private.can(salon_id, 'see_all') or member_id = private.my_member_id(salon_id)));
create policy appointments_update on public.appointments for update to authenticated
  using (private.can(salon_id, 'edit')
         and (private.can(salon_id, 'see_all') or member_id = private.my_member_id(salon_id)))
  with check (private.can(salon_id, 'edit')
              and (private.can(salon_id, 'see_all') or member_id = private.my_member_id(salon_id)));
create policy appointments_delete on public.appointments for delete to authenticated
  using (private.is_owner(salon_id));

-- booking_codes: nessuna policy. Solo le funzioni server (service role).

-- notifiche e push: ognuno gestisce le proprie.
create policy notification_prefs_own on public.notification_prefs for all to authenticated
  using (exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid())));
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.members m where m.id = member_id and m.user_id = (select auth.uid())));

-- ─────────────────────────────────────────────────────────────
-- Privilegi
-- anon non tocca nessuna tabella. Telefono ed email dei clienti non si leggono
-- dalla tabella: si leggono da clients_visible, che li azzera senza il permesso.
-- ─────────────────────────────────────────────────────────────
revoke all on all tables in schema public from anon;
revoke all on public.booking_codes from authenticated;

revoke select on public.clients from authenticated;
grant select (id, salon_id, name, note, privacy_accepted_at, marketing_opt_in, created_at)
  on public.clients to authenticated;

-- Vista con i privilegi del proprietario: filtra da sola sul salone dell’utente.
create view public.clients_visible
with (security_barrier = true)
as
  select c.id, c.salon_id, c.name,
         case when private.can(c.salon_id, 'contacts') then c.phone end as phone,
         case when private.can(c.salon_id, 'contacts') then c.email end as email,
         c.note, c.privacy_accepted_at, c.marketing_opt_in, c.created_at
  from public.clients c
  where private.is_member(c.salon_id);

revoke all on public.clients_visible from anon, public;
grant select on public.clients_visible to authenticated;

-- Rifiniture rispetto a docs/02-modello-dati.md:
-- • chiavi composte (id, salon_id): un appuntamento non può puntare a operatore,
--   cliente o servizio di un altro salone;
-- • vincoli su durate, orari, intervalli di chiusura, valori ammessi delle regole;
-- • cancelled_by obbligatorio solo per gli annullati;
-- • trial_ends_at con valore predefinito (+15 giorni);
-- • free_slots, la vista pubblica e la funzione di prenotazione arrivano nelle fasi 2 e 4.
