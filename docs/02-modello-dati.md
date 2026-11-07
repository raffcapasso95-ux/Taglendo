# Modello dei dati (PostgreSQL / Supabase)

Bozza di partenza: va rifinita durante la Fase 0. Ogni tabella ha RLS attiva e le policy limitano tutto a `salon_id` dei membri dell'utente.

```sql
create extension if not exists btree_gist;

create type plan_t as enum ('trial','solo','salone');
create type sub_status_t as enum ('trialing','active','past_due','canceled','expired');
create type role_t as enum ('owner','barber');
create type appt_status_t as enum ('confermato','completato','annullato','non_presentato');
create type appt_source_t as enum ('manuale','online','in_negozio');

create table salons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,               -- barberia-saragozza
  name text not null check (char_length(name) <= 60),
  address text, area text,                 -- “Porta Saragozza · Bologna”
  phone text not null,
  description text check (char_length(description) <= 160),
  instagram text, cover_path text,
  timezone text not null default 'Europe/Rome',
  -- regole per i clienti (docs/04-regole.md)
  booking_online boolean not null default true,
  cancel_online  boolean not null default true,
  show_prices    boolean not null default true,
  min_notice_min   int not null default 120,  -- 30 | 120 | 1440
  max_advance_days int not null default 14,   -- 14 | 30 | 60
  slot_step_min    int not null default 15,   -- 15 | 30
  cancel_limit_min int not null default 120,  -- 120 | 1440
  -- permessi dei barbieri
  barbers_see_all   boolean not null default true,
  barbers_edit      boolean not null default true,
  barbers_contacts  boolean not null default false,
  -- abbonamento
  plan plan_t not null default 'trial',
  sub_status sub_status_t not null default 'trialing',
  trial_ends_at timestamptz not null,
  stripe_customer_id text, stripe_subscription_id text,
  vat_number text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table members (                       -- operatori = poltrone
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons on delete cascade,
  user_id uuid references auth.users,         -- null finché l’invito non è accettato
  name text not null check (char_length(name) <= 40),
  role role_t not null default 'barber',
  chair_no int not null check (chair_no between 1 and 3),
  bio text, photo_path text,
  invite_email text, invite_token text unique, invite_expires_at timestamptz,
  active boolean not null default true,
  unique (salon_id, chair_no)
);

create table opening_hours (                 -- l'interruttore del giorno
  salon_id uuid references salons on delete cascade,
  weekday int check (weekday between 0 and 6), -- 0 = domenica
  closed boolean not null default false,
  primary key (salon_id, weekday)
);

create table opening_ranges (                -- le fasce di ogni giorno (ridisegno novembre 2026)
  salon_id uuid not null, weekday int not null,
  start_min int not null, end_min int not null,  -- minuti dalla mezzanotte: 540 = 9:00
  primary key (salon_id, weekday, start_min),
  check (start_min < end_min),
  exclude using gist (salon_id with =, weekday with =, int4range(start_min, end_min) with &&),
  foreign key (salon_id, weekday) references opening_hours on delete cascade
);
-- La «pausa pranzo» è lo spazio fra due fasce. Si salva con set_week_hours(salone, settimana): o tutto o niente, solo il titolare.

create table closures (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons on delete cascade,
  member_id uuid references members,          -- null = tutto il salone
  starts_on date not null, ends_on date not null,
  note text
);

create table services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons on delete cascade,
  name text not null check (char_length(name) <= 60),
  duration_min int not null check (duration_min between 5 and 240),
  price_cents int not null check (price_cents >= 0),
  active boolean not null default true,
  sort int not null default 0
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons on delete cascade,
  name text not null check (char_length(name) <= 60),
  phone text, email text, note text check (char_length(note) <= 500),
  privacy_accepted_at timestamptz, marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);
create index on clients (salon_id, lower(name));

create table appointments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons on delete cascade,
  member_id uuid not null references members,
  client_id uuid references clients on delete set null,
  service_id uuid references services,
  service_name text not null, price_cents int not null,   -- copiati alla prenotazione
  starts_at timestamptz not null, ends_at timestamptz not null,
  status appt_status_t not null default 'confermato',
  source appt_source_t not null default 'manuale',
  public_code text unique not null,           -- TG-4829
  manage_token text unique not null,          -- link “Gestisci la prenotazione”
  cancelled_by text,                          -- 'cliente' | 'salone'
  created_at timestamptz not null default now(),
  exclude using gist (member_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status = 'confermato')
);

create table booking_codes (                  -- codice email a 6 cifre
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons on delete cascade,
  email text not null, code_hash text not null,
  payload jsonb not null,                     -- servizio, operatore, orario, dati cliente
  expires_at timestamptz not null,            -- +10 minuti
  attempts int not null default 0             -- massimo 5
);

create table notification_prefs (
  member_id uuid primary key references members on delete cascade,
  new_booking boolean not null default true,
  client_cancel boolean not null default true,
  daily_summary boolean not null default false,
  channel text not null default 'push',        -- push | email | both
  only_mine boolean not null default false
);

create table email_prefs (
  salon_id uuid primary key references salons on delete cascade,
  confirmation boolean not null default true,
  reminder boolean not null default true,
  cancellation boolean not null default true
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members on delete cascade,
  endpoint text unique not null, keys jsonb not null
);
```

## Viste e funzioni utili
- `free_slots(salon_id, service_id, member_id|null, from_date, days)` restituisce gli orari liberi. Tiene conto di:
  - orari di apertura e pause;
  - chiusure;
  - preavviso minimo e anticipo massimo;
  - passo degli orari;
  - durata del servizio e appuntamenti confermati.

  Va usata sia dal gestionale sia dalla pagina pubblica.
- `client_stats`: visite, ultima visita e spesa per cliente.

## Sicurezza (RLS)
- **Membri:** leggono e scrivono solo le righe del proprio `salon_id`. Per i barbieri, `barbers_see_all`, `barbers_edit` e `barbers_contacts` limitano cosa vedono e modificano.
- **Pagina pubblica:** legge solo una vista pubblica, che contiene nome, indirizzo, telefono, descrizione, servizi attivi (prezzo solo se `show_prices`), barbieri attivi e orari liberi. Mai i clienti.
- **Prenotazioni dei clienti:** passano da una funzione server, mai da insert diretti. Controlla nell'ordine:
  1. che il codice sia valido;
  2. che lo slot sia libero;
  3. che `booking_online` sia attivo;
  4. che l'abbonamento sia attivo.
