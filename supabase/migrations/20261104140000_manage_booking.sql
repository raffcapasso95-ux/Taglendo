-- Gestione della prenotazione dal link nell'email: si legge e si annulla con il token personale.
-- Le chiama solo il server con la chiave di servizio.

-- Cosa si vede aprendo il link. Null se il token non esiste.
create function public.booking_by_token(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'status', a.status,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'public_code', a.public_code,
    'service_name', a.service_name,
    'duration_min', (select sv.duration_min from public.services sv where sv.id = a.service_id),
    'price_cents', a.price_cents,
    'member_name', (select m.name from public.members m where m.id = a.member_id),
    'member_count', (select count(*) from public.members m where m.salon_id = a.salon_id and m.active),
    'salon', jsonb_build_object(
      'slug', s.slug, 'name', s.name, 'address', s.address, 'area', s.area, 'phone', s.phone,
      'cancel_online', s.cancel_online, 'cancel_limit_min', s.cancel_limit_min, 'show_prices', s.show_prices,
      'booking_online', s.booking_online, 'cancel_email', coalesce((select e.cancellation from public.email_prefs e where e.salon_id = s.id), true),
      'hours', coalesce((select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'closed', h.closed, 'open_min', h.open_min, 'close_min', h.close_min,
                                                              'break_start_min', h.break_start_min, 'break_end_min', h.break_end_min) order by h.weekday)
                         from public.opening_hours h where h.salon_id = s.id), '[]'::jsonb)))
  from public.appointments a
  join public.salons s on s.id = a.salon_id and s.deleted_at is null
  where a.manage_token = p_token
$$;
revoke all on function public.booking_by_token(text) from public, anon, authenticated;
grant execute on function public.booking_by_token(text) to service_role;

-- Annullamento dal cliente. Regole (docs/04-regole.md): solo se il salone lo permette,
-- solo per appuntamenti confermati non ancora iniziati, fino a cancel_limit_min prima.
create function public.cancel_booking_by_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  a public.appointments%rowtype;
  s public.salons%rowtype;
  c public.clients%rowtype;
begin
  select * into a from public.appointments where manage_token = p_token for update;
  if not found then
    return jsonb_build_object('status', 'gone');
  end if;
  select * into s from public.salons where id = a.salon_id and deleted_at is null;
  if not found or a.status <> 'confermato' or a.starts_at <= now() then
    return jsonb_build_object('status', 'gone');
  end if;
  if not s.cancel_online then
    return jsonb_build_object('status', 'not_allowed');
  end if;
  if now() > a.starts_at - make_interval(mins => s.cancel_limit_min) then
    return jsonb_build_object('status', 'too_late');
  end if;

  update public.appointments set status = 'annullato', cancelled_by = 'cliente' where id = a.id;
  select * into c from public.clients where id = a.client_id;
  return jsonb_build_object(
    'status', 'ok',
    'starts_at', a.starts_at,
    'service_name', a.service_name,
    'client_name', c.name,
    'client_email', c.email,
    'salon_name', s.name, 'salon_slug', s.slug, 'salon_phone', s.phone, 'salon_address', s.address,
    'send_email', coalesce((select e.cancellation from public.email_prefs e where e.salon_id = s.id), true));
end
$$;
revoke all on function public.cancel_booking_by_token(text) from public, anon, authenticated;
grant execute on function public.cancel_booking_by_token(text) to service_role;
