-- Taglendo · Fase 3a: statistiche dei clienti per la rubrica

-- Visite, ultima visita, spesa, prossimo appuntamento e "il solito" (servizio e barbiere più frequenti).
-- security_invoker: la vista gira con i permessi di chi la guarda, quindi valgono le regole di
-- appuntamenti e clienti (un barbiere senza "vedere l'agenda di tutti" conta solo i propri).
-- Non contiene telefono né email: quelli passano da clients_visible.
create view public.client_stats
with (security_invoker = true)
as
select
  c.id as client_id,
  c.salon_id,
  count(a.id) filter (where a.status = 'completato') as visits,
  max(a.starts_at) filter (where a.status = 'completato') as last_visit_at,
  coalesce(sum(a.price_cents) filter (where a.status = 'completato'), 0)::bigint as spent_cents,
  min(a.starts_at) filter (where a.status = 'confermato' and a.ends_at > now()) as next_at,
  (
    select u.service_id
    from public.appointments u
    where u.client_id = c.id and u.status in ('confermato', 'completato') and u.service_id is not null
    group by u.service_id
    order by count(*) desc, max(u.starts_at) desc
    limit 1
  ) as usual_service_id,
  (
    select u.member_id
    from public.appointments u
    where u.client_id = c.id and u.status in ('confermato', 'completato')
    group by u.member_id
    order by count(*) desc, max(u.starts_at) desc
    limit 1
  ) as usual_member_id
from public.clients c
left join public.appointments a on a.client_id = c.id
group by c.id, c.salon_id;

revoke all on public.client_stats from anon, public;
grant select on public.client_stats to authenticated;

-- Per cercare e ordinare la rubrica
create index if not exists appointments_client_status_idx on public.appointments (client_id, status, starts_at);
