-- Taglendo · toglie gli account di prova e ne crea di nuovi, con le agende già piene.
--
-- Si lancia a mano nell'editor SQL di Supabase. Prima guarda chi c'è con account-di-prova-elenco.sql.
-- È ripetibile: ogni volta toglie e ricrea, con le date relative a oggi.
--
-- 1) TOGLIE
--    • tutti gli utenti con indirizzo .example o @example.com (dati demo e test automatici),
--    • gli indirizzi che scrivi tu nella lista «da_togliere» qui sotto (gli account fatti a mano per provare),
--    • i loro saloni, con appuntamenti, clienti, listino e orari, ma SOLO se nel salone non c'è
--      nessun altro utente vero (un barbiere vero non perde il suo salone).
--    Le foto caricate (clienti e salone) restano nello Storage: si tolgono dal pannello Storage se servono.
--
-- 2) CREA (password per tutti: taglendo-prova)
--    • Barberia Da Nino      · 1 poltrona  · nino@taglendo-prova.example (titolare)
--    • Lorenzo & Figli       · 2 poltrone  · lorenzo@taglendo-prova.example (titolare), davide@taglendo-prova.example (barbiere)
--    • Barberia Porta Nuova  · 3 poltrone  · chiara@taglendo-prova.example (titolare), fabio@… e kevin@taglendo-prova.example (barbieri)
--    Tutti aperti mar–sab 9–13 e 14:30–19. Appuntamenti fissati nelle prossime due settimane (circa 7 posti su 10),
--    qualcuno arrivato dal link (online) e qualcuno annullato; nelle ultime sei settimane visite concluse,
--    così Statistiche e schede clienti hanno numeri veri.

begin;

-- ── 1. Chi togliere ─────────────────────────────────────────
create temporary table da_togliere (email text primary key) on commit drop;

-- Scrivi qui gli account di prova fatti a mano (uno per riga, tra apici), poi lancia tutto lo script.
insert into da_togliere (email) values
  ('scrivi-qui@la-tua-email-di-prova.it')   -- ← sostituisci o aggiungi righe; questa riga di esempio non tocca nessuno
on conflict do nothing;

insert into da_togliere (email)
select lower(email) from auth.users
where email like '%.example' or email like '%@example.com'
on conflict do nothing;

create temporary table utenti_da_togliere on commit drop as
select u.id from auth.users u join da_togliere t on t.email = lower(u.email);

-- saloni da togliere: almeno un utente da togliere e nessun utente vero rimasto dentro
create temporary table saloni_da_togliere on commit drop as
select m.salon_id as id
from public.members m
where m.user_id is not null
group by m.salon_id
having bool_and(m.user_id in (select id from utenti_da_togliere));

-- quanto si toglie (si legge nei messaggi dell'editor)
do $$
begin
  raise notice 'Utenti da togliere: %', (select count(*) from utenti_da_togliere);
  raise notice 'Saloni da togliere: % (%)', (select count(*) from saloni_da_togliere),
    (select string_agg(s.name, ', ') from public.salons s where s.id in (select id from saloni_da_togliere));
end $$;

delete from public.salons where id in (select id from saloni_da_togliere);
delete from auth.identities where user_id in (select id from utenti_da_togliere);
delete from auth.users where id in (select id from utenti_da_togliere);

-- ── 2. Account nuovi ─────────────────────────────────────────
create schema seed_prova;

-- 'YYYY-MM-DD' + minuti → orario di Roma
create function seed_prova.at(d date, minutes int) returns timestamptz language sql immutable as $$
  select (d::timestamp + make_interval(mins => minutes)) at time zone 'Europe/Rome'
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('taglendo-prova', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('name', u.name), now(), now(),
       '', '', '', ''
from (values
  ('a6000000-0000-4000-8000-000000000001'::uuid, 'nino@taglendo-prova.example', 'Nino Esposito'),
  ('a6000000-0000-4000-8000-000000000002'::uuid, 'lorenzo@taglendo-prova.example', 'Lorenzo Ricci'),
  ('a6000000-0000-4000-8000-000000000003'::uuid, 'davide@taglendo-prova.example', 'Davide Ricci'),
  ('a6000000-0000-4000-8000-000000000004'::uuid, 'chiara@taglendo-prova.example', 'Chiara Galli'),
  ('a6000000-0000-4000-8000-000000000005'::uuid, 'fabio@taglendo-prova.example', 'Fabio Marchi'),
  ('a6000000-0000-4000-8000-000000000006'::uuid, 'kevin@taglendo-prova.example', 'Kevin Rossi')
) as u(id, email, name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u where u.id::text like 'a6000000-%';

insert into public.salons (id, slug, name, address, area, phone, description, trial_ends_at, created_at, onboarding_step)
values
  ('5a600000-0000-4000-8000-000000000001', 'barberia-da-nino-prova', 'Barberia Da Nino', 'Via Toledo 210, Napoli', 'Toledo · Napoli', '081 555 0101',
   'Una poltrona, il caffè sempre pronto.', now() + interval '15 days', now() - interval '60 days', 5),
  ('5a600000-0000-4000-8000-000000000002', 'lorenzo-e-figli-prova', 'Lorenzo & Figli', 'Corso Vercelli 18, Milano', 'Vercelli · Milano', '02 555 0202',
   'Padre e figlio, due poltrone, dal 1987.', now() + interval '15 days', now() - interval '60 days', 5),
  ('5a600000-0000-4000-8000-000000000003', 'barberia-porta-nuova-prova', 'Barberia Porta Nuova', 'Via Roma 77, Torino', 'Porta Nuova · Torino', '011 555 0303',
   'Tre poltrone a due passi dalla stazione.', now() + interval '15 days', now() - interval '60 days', 5);

insert into public.email_prefs (salon_id) select id from public.salons where id::text like '5a600000-%';

-- mar–sab 9–13 e 14:30–19; domenica e lunedì chiuso
insert into public.opening_hours (salon_id, weekday, closed)
select s.id, w, w in (0, 1) from public.salons s, generate_series(0, 6) w where s.id::text like '5a600000-%';
insert into public.opening_ranges (salon_id, weekday, start_min, end_min)
select s.id, w, r.s, r.e from public.salons s, generate_series(2, 6) w, (values (540, 780), (870, 1140)) as r(s, e)
where s.id::text like '5a600000-%';

insert into public.members (id, salon_id, user_id, name, role, chair_no) values
  ('3e600000-0000-4000-8000-000000000001', '5a600000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'Nino', 'owner', 1),
  ('3e600000-0000-4000-8000-000000000002', '5a600000-0000-4000-8000-000000000002', 'a6000000-0000-4000-8000-000000000002', 'Lorenzo', 'owner', 1),
  ('3e600000-0000-4000-8000-000000000003', '5a600000-0000-4000-8000-000000000002', 'a6000000-0000-4000-8000-000000000003', 'Davide', 'barber', 2),
  ('3e600000-0000-4000-8000-000000000004', '5a600000-0000-4000-8000-000000000003', 'a6000000-0000-4000-8000-000000000004', 'Chiara', 'owner', 1),
  ('3e600000-0000-4000-8000-000000000005', '5a600000-0000-4000-8000-000000000003', 'a6000000-0000-4000-8000-000000000005', 'Fabio', 'barber', 2),
  ('3e600000-0000-4000-8000-000000000006', '5a600000-0000-4000-8000-000000000003', 'a6000000-0000-4000-8000-000000000006', 'Kevin', 'barber', 3);

-- stesso listino nei tre saloni (sort 0–3: serve a sceglierne uno a caso più sotto)
insert into public.services (salon_id, name, duration_min, price_cents, sort)
select s.id, v.name, v.dur, v.price, v.sort
from public.salons s, (values ('Taglio uomo', 30, 2000, 0), ('Barba', 20, 1200, 1), ('Taglio e barba', 50, 3000, 2), ('Taglio bambino', 25, 1500, 3)) as v(name, dur, price, sort)
where s.id::text like '5a600000-%';

-- 12 clienti per salone (pos 0–11)
insert into public.clients (salon_id, name, phone, email, note, created_at)
select s.id, c.name, '+39 333 ' || lpad((100 + c.pos)::text, 3, '0') || ' ' || lpad((1000 + c.pos * 37)::text, 4, '0'),
       case when c.pos % 3 = 0 then lower(replace(c.name, ' ', '.')) || '@example.com' end,
       case when c.pos = 2 then 'Sfumatura bassa, niente gel.' when c.pos = 7 then 'Porta il figlio il sabato.' end,
       now() - make_interval(days => 30 + c.pos * 20)
from public.salons s,
     (select name, (row_number() over () - 1)::int as pos from unnest(array[
       'Marco Bianchi', 'Luca Ferrari', 'Giuseppe Romano', 'Francesco Colombo', 'Alessandro Ricci', 'Matteo Marino',
       'Andrea Greco', 'Stefano Bruno', 'Davide Gallo', 'Simone Conti', 'Gabriele De Luca', 'Riccardo Costa']) as name) as c
where s.id::text like '5a600000-%';

-- Appuntamenti: per ogni barbiere, nei giorni di apertura da sei settimane fa a due settimane avanti,
-- un posto ogni ora (sfalsato di 15 minuti tra un barbiere e l'altro) riempito circa 7 volte su 10.
-- Un servizio dura al massimo 50 minuti: con un posto all'ora non si sovrappongono mai.
-- Quelli già passati sono «completato», i futuri «confermato»; circa 1 su 30 è annullato dal cliente.
with giorni as (
  select d::date as d
  from generate_series((now() at time zone 'Europe/Rome')::date - 42, (now() at time zone 'Europe/Rome')::date + 14, interval '1 day') d
  where extract(dow from d) between 2 and 6
),
posti(start_min) as (values (540), (600), (660), (720), (870), (930), (990), (1050), (1110)),
barbieri as (
  select m.id, m.salon_id, (m.chair_no - 1) * 15 as sfalsa from public.members m where m.salon_id::text like '5a600000-%'
),
candidati as (
  select b.salon_id, b.id as member_id, g.d, p.start_min + b.sfalsa as st,
         (hashtext(b.id::text || g.d::text || p.start_min::text)::bigint & 2147483647) as h
  from barbieri b cross join giorni g cross join posti p
),
scelti as (
  select c.*, sv.id as service_id, sv.name as service_name, sv.price_cents, sv.duration_min,
         cl.id as client_id, seed_prova.at(c.d, c.st) as starts_at
  from candidati c
  join public.services sv on sv.salon_id = c.salon_id and sv.sort = c.h % 4
  join (select id, salon_id, (row_number() over (partition by salon_id order by created_at desc) - 1)::int as pos from public.clients) cl
    on cl.salon_id = c.salon_id and cl.pos = (c.h / 7) % 12
  where c.h % 100 < 70
    -- dentro la fascia: la mattina finisce alle 13, il pomeriggio alle 19
    and c.st + sv.duration_min <= case when c.st < 780 then 780 else 1140 end
)
insert into public.appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, status, source, public_code, cancelled_by, created_at)
select s.salon_id, s.member_id, s.client_id, s.service_id, s.service_name, s.price_cents,
       s.starts_at, s.starts_at + make_interval(mins => s.duration_min),
       case when s.h % 30 = 0 then 'annullato' when s.starts_at < now() then 'completato' else 'confermato' end::public.appt_status_t,
       case when s.h % 4 = 1 then 'online' else 'manuale' end::public.appt_source_t,
       'TG-P' || lpad((row_number() over (order by s.starts_at, s.member_id))::text, 5, '0'),
       case when s.h % 30 = 0 then 'cliente' end,
       least(s.starts_at, now()) - interval '3 days'
from scelti s;

do $$
begin
  raise notice 'Creati: % saloni, % utenti, % appuntamenti (% da oggi in poi)',
    (select count(*) from public.salons where id::text like '5a600000-%'),
    (select count(*) from auth.users where id::text like 'a6000000-%'),
    (select count(*) from public.appointments where salon_id::text like '5a600000-%'),
    (select count(*) from public.appointments where salon_id::text like '5a600000-%' and status = 'confermato');
end $$;

drop schema seed_prova cascade;

commit;
