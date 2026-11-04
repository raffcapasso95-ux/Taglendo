-- Taglendo · dati demo di Barberia Saragozza
-- Fonte: design/Taglendo App.dc.html, makeData('demo', 3) (stato predefinito del prototipo).
--
-- Le date sono relative al giorno in cui si lancia il seed: il “giorno 0” del prototipo
-- (giovedì 29 ottobre 2026) diventa oggi, così l’agenda demo ha sempre appuntamenti.
-- Se oggi il salone è chiuso (domenica o lunedì) il giorno 0 è il martedì successivo.
-- I giorni 1, 2 e 5 del prototipo diventano il 1°, 2° e 3° giorno di apertura successivi
-- (nel prototipo il giorno 5 è martedì: domenica e lunedì sono chiusi).
--
-- Differenze dal prototipo, volute:
-- • 3 operatori (limite del piano Salone): gli appuntamenti di “Nicolò” (o4) non ci sono;
-- • lo storico arriva fino al numero di visite di ogni cliente, distribuito tra
--   “cliente da” e 13 settimane fa; le ultime visite sono quelle di makeData (past).
--
-- Accessi demo (password: taglendo-demo):
-- • andrea@barberia-saragozza.example  titolare
-- • marco@barberia-saragozza.example   barbiere
-- Simone ha un invito in sospeso.

begin;

create schema seed_tmp;

-- giorno 0 nel fuso di Roma
create function seed_tmp.day0() returns date language sql stable as $$
  select case extract(dow from d)::int when 0 then d + 2 when 1 then d + 1 else d end
  from (select (now() at time zone 'Europe/Rome')::date as d) x
$$;

-- n-esimo giorno di apertura dal giorno 0 (mar–sab)
create function seed_tmp.open_day(n int) returns date language sql stable as $$
  select d from (
    select seed_tmp.day0() + g as d, g from generate_series(0, 30) g
  ) x
  where extract(dow from d)::int between 2 and 6
  order by g offset n limit 1
$$;

-- giorno + minuti dalla mezzanotte, ora di Roma → timestamptz
create function seed_tmp.at(d date, minutes int) returns timestamptz language sql immutable as $$
  select (d::timestamp + make_interval(mins => minutes)) at time zone 'Europe/Rome'
$$;

-- ── Utenti demo ──────────────────────────────────────────────
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
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'andrea@barberia-saragozza.example', 'Andrea'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'marco@barberia-saragozza.example', 'Marco')
) as u(id, email, name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id in ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002');

-- ── Salone ───────────────────────────────────────────────────
insert into public.salons (id, slug, name, address, area, phone, description, trial_ends_at, created_at, onboarding_step)
values (
  '5a100000-0000-4000-8000-000000000001', 'barberia-saragozza', 'Barberia Saragozza',
  'Via Saragozza 48, Bologna', 'Porta Saragozza · Bologna', '051 644 2190',
  'Taglio, barba e rasatura con tre barbieri in Via Saragozza.',
  now() + interval '15 days', now(), 5
);

insert into public.email_prefs (salon_id) values ('5a100000-0000-4000-8000-000000000001');

-- Orari predefiniti: mar–sab 9:00–19:00, pausa 13:00–14:30, chiuso domenica e lunedì
insert into public.opening_hours (salon_id, weekday, closed, open_min, close_min, break_start_min, break_end_min)
select '5a100000-0000-4000-8000-000000000001', w,
       w in (0, 1),
       case when w in (0, 1) then null else 540 end,
       case when w in (0, 1) then null else 1140 end,
       case when w in (0, 1) then null else 780 end,
       case when w in (0, 1) then null else 870 end
from generate_series(0, 6) w;

-- ── Operatori (poltrone) ─────────────────────────────────────
insert into public.members (id, salon_id, user_id, name, role, chair_no, invite_email, invite_token, invite_expires_at)
values
  ('3e300000-0000-4000-8000-000000000001', '5a100000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'Andrea', 'owner', 1, null, null, null),
  ('3e300000-0000-4000-8000-000000000002', '5a100000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000002', 'Marco', 'barber', 2, null, null, null),
  ('3e300000-0000-4000-8000-000000000003', '5a100000-0000-4000-8000-000000000001',
   null, 'Simone', 'barber', 3, 'simone@barberia-saragozza.example',
   'invito-demo-simone-0123456789abcdef', now() + interval '7 days');

insert into public.notification_prefs (member_id, daily_summary)
values ('3e300000-0000-4000-8000-000000000001', true),
       ('3e300000-0000-4000-8000-000000000002', false);

-- ── Listino ──────────────────────────────────────────────────
insert into public.services (id, salon_id, name, duration_min, price_cents, sort)
values
  ('5e500000-0000-4000-8000-000000000001', '5a100000-0000-4000-8000-000000000001', 'Taglio uomo', 30, 2000, 1),
  ('5e500000-0000-4000-8000-000000000002', '5a100000-0000-4000-8000-000000000001', 'Barba', 20, 1200, 2),
  ('5e500000-0000-4000-8000-000000000003', '5a100000-0000-4000-8000-000000000001', 'Taglio e barba', 50, 3000, 3),
  ('5e500000-0000-4000-8000-000000000004', '5a100000-0000-4000-8000-000000000001', 'Rasatura classica', 30, 1800, 4),
  ('5e500000-0000-4000-8000-000000000005', '5a100000-0000-4000-8000-000000000001', 'Taglio bambino', 25, 1500, 5);

-- ── Clienti ──────────────────────────────────────────────────
-- k: posizione in makeData (serve per le date delle visite passate)
-- svc/op: servizio e barbiere abituali · since: “cliente da” · visits: visite totali
-- old: indice di partenza in PAST per c12 e c13 (makeData, OLD)
create table seed_tmp.clients (
  k int, ref text, id uuid, name text, phone text, email text, svc int, op int,
  note text, since date, visits int, old int
);
insert into seed_tmp.clients values
  (0,  'c1',  'c1100000-0000-4000-8000-000000000001', 'Luca Rossi',       '+39 333 412 8890', 'luca.rossi@example.com',   1, 1, 'Sfumatura bassa, 2 cm sopra. Niente riga.', '2024-03-01', 14, null),
  (1,  'c2',  'c1100000-0000-4000-8000-000000000002', 'Marco Bianchi',    '+39 347 220 1456', null,                       3, 1, 'Barba squadrata, olio senza profumo.', '2023-01-01', 31, null),
  (2,  'c3',  'c1100000-0000-4000-8000-000000000003', 'Davide Ferri',     '+39 320 998 7712', 'davide.ferri@example.com', 2, 2, null, '2025-09-01', 4, null),
  (3,  'c4',  'c1100000-0000-4000-8000-000000000004', 'Giorgio Conti',    '+39 339 552 0034', null,                       1, 2, 'Arriva sempre qualche minuto prima. Tifoso del Bologna.', '2024-06-01', 11, null),
  (4,  'c5',  'c1100000-0000-4000-8000-000000000005', 'Matteo Russo',     '+39 348 667 2210', null,                       4, 1, 'Pelle sensibile: panno caldo, niente alcool.', '2025-02-01', 7, null),
  (5,  'c6',  'c1100000-0000-4000-8000-000000000006', 'Samuele Greco',    '+39 333 909 4411', null,                       5, 2, '9 anni. Viene con il papà, Paolo.', '2025-04-01', 6, null),
  (6,  'c7',  'c1100000-0000-4000-8000-000000000007', 'Pietro Lombardi',  '+39 340 112 3344', null,                       1, 1, null, '2024-11-01', 9, null),
  (7,  'c8',  'c1100000-0000-4000-8000-000000000008', 'Francesco Galli',  '+39 329 450 8812', null,                       3, 2, 'Preferisce il pomeriggio.', '2023-05-01', 22, null),
  (8,  'c9',  'c1100000-0000-4000-8000-000000000009', 'Riccardo Marino',  '+39 351 778 9021', null,                       2, 1, null, '2025-08-01', 3, null),
  (9,  'c10', 'c1100000-0000-4000-8000-000000000010', 'Antonio Esposito', '+39 338 224 6610', null,                       1, 1, null, '2022-10-01', 40, null),
  (10, 'c11', 'c1100000-0000-4000-8000-000000000011', 'Stefano Moretti',  '+39 334 887 1209', null,                       1, 1, 'Taglio a forbice, niente macchinetta.', '2024-07-01', 12, null),
  (11, 'c12', 'c1100000-0000-4000-8000-000000000012', 'Alessio Ricci',    '+39 345 221 7780', null,                       3, 2, 'Barba lunga, solo rifinitura.', '2023-03-01', 18, 5),
  (12, 'c13', 'c1100000-0000-4000-8000-000000000013', 'Emanuele Costa',   '+39 328 640 1195', null,                       1, 1, null, '2025-01-01', 6, 7);

insert into public.clients (id, salon_id, name, phone, email, note, created_at)
select id, '5a100000-0000-4000-8000-000000000001', name, phone, email, note,
       seed_tmp.at(since, 600)
from seed_tmp.clients;

-- ── Appuntamenti dell’agenda (makeData, kind = 'demo') ───────
-- day: giorno del prototipo · start: minuti · op: poltrona
create table seed_tmp.agenda (day int, start int, client text, svc int, op int, status public.appt_status_t, source public.appt_source_t);
insert into seed_tmp.agenda values
  (0, 540,  'c1',  1, 1, 'completato', 'manuale'),
  (0, 570,  'c3',  2, 2, 'completato', 'online'),
  (0, 600,  'c2',  3, 1, 'confermato', 'manuale'),
  (0, 630,  'c4',  1, 2, 'confermato', 'manuale'),
  (0, 660,  'c5',  4, 1, 'confermato', 'online'),
  (0, 720,  'c6',  5, 2, 'confermato', 'manuale'),
  (0, 870,  'c7',  1, 1, 'confermato', 'manuale'),
  (0, 930,  'c8',  3, 2, 'confermato', 'manuale'),
  (0, 990,  'c9',  2, 1, 'confermato', 'online'),
  (0, 1050, 'c10', 1, 1, 'annullato',  'manuale'),
  (1, 570,  'c11', 1, 1, 'confermato', 'manuale'),
  (1, 600,  'c3',  2, 2, 'confermato', 'manuale'),
  (1, 900,  'c8',  1, 2, 'confermato', 'online'),
  (1, 1020, 'c1',  3, 1, 'confermato', 'manuale'),
  (2, 540,  'c2',  1, 1, 'confermato', 'manuale'),
  (2, 570,  'c4',  3, 2, 'confermato', 'manuale'),
  (2, 630,  'c7',  1, 1, 'confermato', 'manuale'),
  (2, 660,  'c10', 2, 2, 'confermato', 'manuale'),
  (2, 720,  'c5',  1, 1, 'confermato', 'manuale'),
  (2, 900,  'c9',  1, 2, 'confermato', 'manuale'),
  (5, 600,  'c6',  5, 2, 'confermato', 'manuale'),
  (5, 960,  'c1',  1, 1, 'confermato', 'manuale'),
  (0, 540,  'c11', 1, 3, 'completato', 'manuale'),
  (0, 615,  'c12', 3, 3, 'confermato', 'manuale'),
  (0, 690,  'c13', 1, 3, 'confermato', 'online'),
  (0, 900,  'c5',  2, 3, 'confermato', 'manuale'),
  (0, 960,  'c2',  1, 3, 'confermato', 'manuale'),
  (1, 600,  'c12', 1, 3, 'confermato', 'manuale');

-- ── Storico visite ───────────────────────────────────────────
-- Le ultime (fino a 3) sono quelle di makeData: PAST[i] = i+1 settimane prima del giorno 0.
-- Le altre, fino al totale delle visite, si distribuiscono tra “cliente da” e 13 settimane fa.
-- Orari di comodo, sempre dentro l’apertura e fuori dalla pausa.
create table seed_tmp.history (client text, weeks_ago int, slot int, svc int, op int);

insert into seed_tmp.history
select c.ref,
       case when c.old is not null then c.old + j * 2 + 1 else (c.k * 2) % 6 + j * 2 + 1 end,
       (c.k + j) % 8, c.svc, c.op
from seed_tmp.clients c
cross join lateral generate_series(0, least(3, c.visits) - 1) j;

insert into seed_tmp.history
select c.ref,
       13 + ceil(i * greatest(span.w - 13, 1)::numeric / extra.n)::int,
       (c.k + i + 3) % 8, c.svc, c.op
from seed_tmp.clients c
cross join lateral (
  select c.visits - least(3, c.visits)
         - (select count(*) from seed_tmp.agenda a where a.client = c.ref and a.status = 'completato')::int as n
) extra
cross join lateral (select ((seed_tmp.day0() - c.since) / 7) as w) span
cross join lateral generate_series(1, greatest(extra.n, 0)) i;

-- ── Inserimento appuntamenti ─────────────────────────────────
with slots(slot, minutes) as (
  values (0, 540), (1, 600), (2, 660), (3, 720), (4, 870), (5, 930), (6, 990), (7, 1050)
),
rows_ as (
  select a.client, a.svc, a.op, a.status, a.source,
         seed_tmp.at(seed_tmp.open_day(case a.day when 5 then 3 else a.day end), a.start) as starts_at
  from seed_tmp.agenda a
  union all
  select h.client, h.svc, h.op, 'completato'::public.appt_status_t, 'manuale'::public.appt_source_t,
         seed_tmp.at(seed_tmp.day0() - h.weeks_ago * 7, s.minutes)
  from seed_tmp.history h join slots s using (slot)
)
insert into public.appointments (
  salon_id, member_id, client_id, service_id, service_name, price_cents,
  starts_at, ends_at, status, source, public_code, cancelled_by, created_at
)
select '5a100000-0000-4000-8000-000000000001',
       ('3e300000-0000-4000-8000-00000000000' || r.op)::uuid,
       c.id, s.id, s.name, s.price_cents,
       r.starts_at, r.starts_at + make_interval(mins => s.duration_min),
       r.status, r.source,
       'TG-' || (4000 + row_number() over (order by r.starts_at, r.op)),
       case when r.status = 'annullato' then 'salone' end,
       least(r.starts_at - interval '2 days', now())
from rows_ r
join seed_tmp.clients c on c.ref = r.client
join public.services s on s.id = ('5e500000-0000-4000-8000-00000000000' || r.svc)::uuid;

drop schema seed_tmp cascade;

commit;
