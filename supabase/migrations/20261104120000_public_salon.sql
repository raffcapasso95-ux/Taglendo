-- La pagina pubblica del salone: un'unica funzione restituisce solo ciò che si può mostrare a chiunque.
-- Niente tabelle aperte ad anon: nome, servizi attivi, barbieri attivi (senza email né user_id), orari e regole.
create function public.public_salon(p_slug text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id,
    'slug', s.slug,
    'name', s.name,
    'address', s.address,
    'area', s.area,
    'phone', s.phone,
    'description', s.description,
    'instagram', s.instagram,
    'cover_path', s.cover_path,
    'booking_online', s.booking_online,
    'cancel_online', s.cancel_online,
    'show_prices', s.show_prices,
    'cancel_limit_min', s.cancel_limit_min,
    'min_notice_min', s.min_notice_min,
    'max_advance_days', s.max_advance_days,
    'sub_status', s.sub_status,
    'trial_ends_at', s.trial_ends_at,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'duration_min', v.duration_min, 'price_cents', v.price_cents) order by v.sort, v.name)
      from public.services v where v.salon_id = s.id and v.active), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'bio', m.bio, 'photo_path', m.photo_path, 'chair_no', m.chair_no) order by m.chair_no)
      from public.members m where m.salon_id = s.id and m.active), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'closed', h.closed, 'open_min', h.open_min, 'close_min', h.close_min,
                                          'break_start_min', h.break_start_min, 'break_end_min', h.break_end_min) order by h.weekday)
      from public.opening_hours h where h.salon_id = s.id), '[]'::jsonb)
  )
  from public.salons s
  where s.slug = lower(p_slug) and s.deleted_at is null
$$;
revoke all on function public.public_salon(text) from public;
grant execute on function public.public_salon(text) to anon, authenticated;
