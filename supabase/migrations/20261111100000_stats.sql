-- Taglendo · ridisegno novembre 2026, passo 7: Statistiche (solo titolare)
-- Contano gli appuntamenti completati, al prezzo fatto (price_cents). Giorni e mesi sono quelli di Europe/Rome.

create function public.stats_summary(p_salon uuid, p_from timestamptz, p_to timestamptz, p_bucket text default 'day')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text;
  v_result jsonb;
begin
  if not private.is_owner(p_salon) then
    raise exception 'Solo il titolare vede le statistiche' using errcode = '42501';
  end if;
  if p_bucket not in ('day', 'month') then
    raise exception 'p_bucket deve essere day o month' using errcode = '22023';
  end if;
  select s.timezone into v_tz from public.salons s where s.id = p_salon and s.deleted_at is null;
  if not found then
    return null;
  end if;

  with done as (
    select a.id, a.member_id, a.client_id, a.price_cents, a.list_price_cents, a.starts_at
    from public.appointments a
    where a.salon_id = p_salon and a.status = 'completato' and a.starts_at >= p_from and a.starts_at < p_to
  )
  select jsonb_build_object(
    'revenue', coalesce((select sum(price_cents) from done), 0),
    'count', (select count(*) from done),
    'clients', (select count(distinct client_id) from done),
    'discounts', coalesce((select sum(list_price_cents - price_cents) from done where list_price_cents > price_cents), 0),
    'no_show', (select count(*) from public.appointments a where a.salon_id = p_salon and a.status = 'non_presentato' and a.starts_at >= p_from and a.starts_at < p_to),
    'canceled', (select count(*) from public.appointments a where a.salon_id = p_salon and a.status = 'annullato' and a.starts_at >= p_from and a.starts_at < p_to),
    'new_clients', (select count(*) from public.clients c where c.salon_id = p_salon and c.created_at >= p_from and c.created_at < p_to),
    'by_member', coalesce((
      select jsonb_agg(jsonb_build_object('member_id', member_id, 'revenue', rev, 'count', n) order by rev desc)
      from (select member_id, sum(price_cents)::int as rev, count(*)::int as n from done group by member_id) m), '[]'::jsonb),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('client_id', t.client_id, 'name', c.name, 'avatar_color', c.avatar_color, 'photo_path', c.photo_path, 'visits', t.n, 'revenue', t.rev) order by t.rev desc, t.n desc, c.name)
      from (select client_id, sum(price_cents)::int as rev, count(*)::int as n from done where client_id is not null group by client_id order by sum(price_cents) desc, count(*) desc limit 3) t
      join public.clients c on c.id = t.client_id and c.salon_id = p_salon), '[]'::jsonb),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', b, 'revenue', rev) order by b)
      from (
        select case when p_bucket = 'month' then to_char(starts_at at time zone v_tz, 'YYYY-MM') else to_char(starts_at at time zone v_tz, 'YYYY-MM-DD') end as b,
               sum(price_cents)::int as rev
        from done group by 1) s), '[]'::jsonb)
  ) into v_result;
  return v_result;
end
$$;
revoke all on function public.stats_summary(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.stats_summary(uuid, timestamptz, timestamptz, text) to authenticated;
