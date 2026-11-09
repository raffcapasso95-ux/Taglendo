-- Taglendo · elenco degli account, per decidere quali sono di prova. SOLO LETTURA: non cambia niente.
--
-- Si lancia nell'editor SQL di Supabase (progetto di produzione o di staging).
-- Per ogni utente: email, nome, quando si è registrato, ultimo accesso, il suo salone e quanti appuntamenti ha.
-- La colonna «di_prova_automatico» dice se account-di-prova.sql lo toglierebbe già da solo
-- (indirizzi .example / @example.com, usati dai dati demo e dai test automatici).

select
  u.email,
  u.raw_user_meta_data ->> 'name'                       as nome,
  to_char(u.created_at at time zone 'Europe/Rome', 'DD/MM/YYYY HH24:MI') as registrato,
  to_char(u.last_sign_in_at at time zone 'Europe/Rome', 'DD/MM/YYYY HH24:MI') as ultimo_accesso,
  s.name                                                 as salone,
  s.slug                                                 as pagina,
  m.role                                                 as ruolo,
  (select count(*) from public.appointments a where a.salon_id = s.id) as appuntamenti_del_salone,
  (u.email like '%.example' or u.email like '%@example.com') as di_prova_automatico
from auth.users u
left join public.members m on m.user_id = u.id
left join public.salons s on s.id = m.salon_id
order by di_prova_automatico desc, u.created_at;
