-- Taglendo · saloni demo per lo staging (si aggiungono a Barberia Saragozza, che ha 3 poltrone).
--   • Barberia Il Rasoio    · 1 poltrona  · lun–sab 8:30–18:30 senza pausa · con casi estremi (nomi e note lunghi)
--   • Due Torri Barber Shop · 2 poltrone  · prezzi nascosti, una chiusura la prossima settimana, un appuntamento online
--
-- Non è un seed automatico: si lancia a mano dove serve (staging), ed è ripetibile — ogni volta
-- cancella i due saloni demo e li ricrea, con le date relative a oggi.
--   Accessi (password: taglendo-demo):
--     luca@il-rasoio.example (titolare di Il Rasoio)
--     giulia@duetorri.example (titolare di Due Torri) · matteo@duetorri.example (barbiere)
-- Per toglierli senza ricrearli: supabase/demo-staging-remove.sql

begin;

-- ripartenza pulita (come demo-staging-remove.sql)
delete from public.salons where id::text like '5a400000-%';
delete from auth.identities where user_id::text like 'a4000000-%';
delete from auth.users where id::text like 'a4000000-%';

create schema seed_demo;

-- n-esimo giorno di apertura (mar–sab) dopo oggi, nel fuso di Roma
create function seed_demo.open_day(n int) returns date language sql stable as $$
  select d from (
    select ((now() at time zone 'Europe/Rome')::date + g) as d, g from generate_series(1, 40) g
  ) x
  where extract(dow from d)::int between 2 and 6
  order by g offset n limit 1
$$;
create function seed_demo.at(d date, minutes int) returns timestamptz language sql immutable as $$
  select (d::timestamp + make_interval(mins => minutes)) at time zone 'Europe/Rome'
$$;

-- ── Utenti ───────────────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('taglendo-demo', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('name', u.name), now(), now(),
       '', '', '', ''
from (values
  ('a4000000-0000-4000-8000-000000000001'::uuid, 'luca@il-rasoio.example', 'Luca'),
  ('a4000000-0000-4000-8000-000000000002'::uuid, 'giulia@duetorri.example', 'Giulia'),
  ('a4000000-0000-4000-8000-000000000003'::uuid, 'matteo@duetorri.example', 'Matteo')
) as u(id, email, name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u where u.id::text like 'a4000000-%';

-- ── Saloni ───────────────────────────────────────────────────
insert into public.salons (id, slug, name, address, area, phone, description, show_prices, trial_ends_at, created_at, onboarding_step)
values
  ('5a400000-0000-4000-8000-000000000001', 'barberia-il-rasoio', 'Barberia Il Rasoio', 'Via del Pratello 12, Bologna', 'Pratello · Bologna', '051 555 0101',
   'Un barbiere, una poltrona, nessuna fretta.', true, now() + interval '15 days', now(), 5),
  ('5a400000-0000-4000-8000-000000000002', 'due-torri-barber-shop', 'Due Torri Barber Shop', 'Strada Maggiore 5, Bologna', 'Centro · Bologna', '051 555 0202',
   'Tagli e barba in centro, con due barbieri.', false, now() + interval '15 days', now(), 5);

insert into public.email_prefs (salon_id) select id from public.salons where id::text like '5a400000-%';

-- Il Rasoio: lun–sab 8:30–18:30 senza pausa, domenica chiuso. Due Torri: mar–sab 9–19, pausa 13–14:30.
insert into public.opening_hours (salon_id, weekday, closed)
select '5a400000-0000-4000-8000-000000000001', w, w = 0 from generate_series(0, 6) w;
insert into public.opening_ranges (salon_id, weekday, start_min, end_min)
select '5a400000-0000-4000-8000-000000000001', w, 510, 1110 from generate_series(1, 6) w;
insert into public.opening_hours (salon_id, weekday, closed)
select '5a400000-0000-4000-8000-000000000002', w, w in (0, 1) from generate_series(0, 6) w;
insert into public.opening_ranges (salon_id, weekday, start_min, end_min)
select '5a400000-0000-4000-8000-000000000002', w, r.s, r.e from generate_series(2, 6) w, (values (540, 780), (870, 1140)) as r(s, e);

-- ── Operatori ────────────────────────────────────────────────
insert into public.members (id, salon_id, user_id, name, role, chair_no) values
  ('3e400000-0000-4000-8000-000000000001', '5a400000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'Luca', 'owner', 1),
  ('3e400000-0000-4000-8000-000000000002', '5a400000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000002', 'Giulia', 'owner', 1),
  ('3e400000-0000-4000-8000-000000000003', '5a400000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000003', 'Matteo', 'barber', 2);

-- ── Listini ──────────────────────────────────────────────────
insert into public.services (id, salon_id, name, duration_min, price_cents, sort) values
  ('5e400000-0000-4000-8000-000000000001', '5a400000-0000-4000-8000-000000000001', 'Taglio uomo', 30, 1800, 1),
  ('5e400000-0000-4000-8000-000000000002', '5a400000-0000-4000-8000-000000000001', 'Barba', 20, 1000, 2),
  ('5e400000-0000-4000-8000-000000000003', '5a400000-0000-4000-8000-000000000001', 'Taglio sfumato con disegno a mano libera e rifinitura', 50, 3200, 3),
  ('5e400000-0000-4000-8000-000000000011', '5a400000-0000-4000-8000-000000000002', 'Taglio uomo', 30, 2200, 1),
  ('5e400000-0000-4000-8000-000000000012', '5a400000-0000-4000-8000-000000000002', 'Taglio e barba', 50, 3200, 2),
  ('5e400000-0000-4000-8000-000000000013', '5a400000-0000-4000-8000-000000000002', 'Taglio bambino', 25, 1500, 3);

-- ── Clienti (anche i casi estremi di docs/06) ────────────────
insert into public.clients (id, salon_id, name, phone, email, note, created_at) values
  ('c1400000-0000-4000-8000-000000000001', '5a400000-0000-4000-8000-000000000001', 'Giovanni Battista Della Valle-Santangelo', '+39 333 100 2001',
   'giovanni.battista.della.valle.santangelo.con.un.indirizzo.email.davvero.lungo@dominio-molto-lungo-di-esempio.example.com', left(repeat('Nota molto lunga. ', 28), 500), now() - interval '300 days'),
  ('c1400000-0000-4000-8000-000000000002', '5a400000-0000-4000-8000-000000000001', 'Jo', '+39 333 100 2002', null, null, now() - interval '200 days'),
  ('c1400000-0000-4000-8000-000000000003', '5a400000-0000-4000-8000-000000000001', 'Ragazzo con lo zaino rosso', null, null, 'Senza telefono: lo chiamiamo dall’ingresso.', now() - interval '20 days'),
  ('c1400000-0000-4000-8000-000000000004', '5a400000-0000-4000-8000-000000000001', 'Cliente Storico', '+39 333 100 2004', 'storico@example.com', 'Viene ogni due settimane da anni.', now() - interval '900 days'),
  ('c1400000-0000-4000-8000-000000000011', '5a400000-0000-4000-8000-000000000002', 'Paolo Neri', '+39 333 200 3001', 'paolo.neri@example.com', null, now() - interval '120 days'),
  ('c1400000-0000-4000-8000-000000000012', '5a400000-0000-4000-8000-000000000002', 'Sara Fabbri', '+39 333 200 3002', null, 'Porta il figlio.', now() - interval '60 days'),
  ('c1400000-0000-4000-8000-000000000013', '5a400000-0000-4000-8000-000000000002', 'Elia Monti', '+39 333 200 3003', 'elia.monti@example.com', null, now() - interval '10 days');

-- ── Appuntamenti ─────────────────────────────────────────────
-- Il Rasoio: giornata piena il 1° giorno di apertura, una cancellata, una conclusa nel passato.
insert into public.appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, status, source, public_code, cancelled_by, created_at)
select a.salon_id, a.member_id, a.client_id, s.id, s.name, s.price_cents, a.starts_at, a.starts_at + make_interval(mins => s.duration_min),
       a.status, a.source, a.code, case when a.status = 'annullato' then 'salone' end, now() - interval '3 days'
from (values
  ('5a400000-0000-4000-8000-000000000001'::uuid, '3e400000-0000-4000-8000-000000000001'::uuid, 'c1400000-0000-4000-8000-000000000001'::uuid, '5e400000-0000-4000-8000-000000000003'::uuid, seed_demo.at(seed_demo.open_day(0), 540),  'confermato'::public.appt_status_t, 'manuale'::public.appt_source_t, 'TG-D001'),
  ('5a400000-0000-4000-8000-000000000001', '3e400000-0000-4000-8000-000000000001', 'c1400000-0000-4000-8000-000000000002', '5e400000-0000-4000-8000-000000000001', seed_demo.at(seed_demo.open_day(0), 630),  'confermato', 'manuale', 'TG-D002'),
  ('5a400000-0000-4000-8000-000000000001', '3e400000-0000-4000-8000-000000000001', 'c1400000-0000-4000-8000-000000000003', '5e400000-0000-4000-8000-000000000002', seed_demo.at(seed_demo.open_day(0), 690),  'confermato', 'manuale', 'TG-D003'),
  ('5a400000-0000-4000-8000-000000000001', '3e400000-0000-4000-8000-000000000001', 'c1400000-0000-4000-8000-000000000004', '5e400000-0000-4000-8000-000000000001', seed_demo.at(seed_demo.open_day(0), 780),  'annullato', 'manuale', 'TG-D004'),
  ('5a400000-0000-4000-8000-000000000001', '3e400000-0000-4000-8000-000000000001', 'c1400000-0000-4000-8000-000000000004', '5e400000-0000-4000-8000-000000000001', seed_demo.at(seed_demo.open_day(1), 600),  'confermato', 'manuale', 'TG-D005')
) as a(salon_id, member_id, client_id, service_id, starts_at, status, source, code)
join public.services s on s.id = a.service_id;

-- 128 visite concluse per «Cliente Storico»
insert into public.appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, status, source, public_code, created_at)
select '5a400000-0000-4000-8000-000000000001', '3e400000-0000-4000-8000-000000000001', 'c1400000-0000-4000-8000-000000000004',
       '5e400000-0000-4000-8000-000000000001', 'Taglio uomo', 1800,
       seed_demo.at(((now() at time zone 'Europe/Rome')::date - (g * 7)), 900), seed_demo.at(((now() at time zone 'Europe/Rome')::date - (g * 7)), 930),
       'completato', 'manuale', 'TG-H' || (1000 + g), now() - make_interval(days => g * 7)
from generate_series(1, 128) g;

-- Due Torri: due barbieri, un appuntamento online già confermato.
insert into public.appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, status, source, public_code, created_at)
select a.salon_id, a.member_id, a.client_id, s.id, s.name, s.price_cents, a.starts_at, a.starts_at + make_interval(mins => s.duration_min), 'confermato', a.source, a.code, now() - interval '1 day'
from (values
  ('5a400000-0000-4000-8000-000000000002'::uuid, '3e400000-0000-4000-8000-000000000002'::uuid, 'c1400000-0000-4000-8000-000000000011'::uuid, '5e400000-0000-4000-8000-000000000011'::uuid, seed_demo.at(seed_demo.open_day(0), 600), 'manuale'::public.appt_source_t, 'TG-D201'),
  ('5a400000-0000-4000-8000-000000000002', '3e400000-0000-4000-8000-000000000003', 'c1400000-0000-4000-8000-000000000012', '5e400000-0000-4000-8000-000000000012', seed_demo.at(seed_demo.open_day(0), 660), 'manuale', 'TG-D202'),
  ('5a400000-0000-4000-8000-000000000002', '3e400000-0000-4000-8000-000000000002', 'c1400000-0000-4000-8000-000000000013', '5e400000-0000-4000-8000-000000000013', seed_demo.at(seed_demo.open_day(1), 900), 'online', 'TG-D203')
) as a(salon_id, member_id, client_id, service_id, starts_at, source, code)
join public.services s on s.id = a.service_id;

-- Chiusura di Due Torri: due giorni di apertura della settimana dopo (tutto il salone)
insert into public.closures (salon_id, member_id, starts_on, ends_on, note)
values ('5a400000-0000-4000-8000-000000000002', null, seed_demo.open_day(6), seed_demo.open_day(7), 'Ferie di prova');

drop schema seed_demo cascade;

commit;
