-- Taglendo · Logo del salone
-- Si carica in Salone › Pagina del salone; si vede nell'agenda e sulla pagina pubblica.
-- Il file sta nel bucket pubblico salon-photos, nella cartella del salone (le policy esistenti valgono già).
alter table public.salons add column logo_path text;
-- lo cambia il titolare (la policy di update dei saloni vale solo per lui)
grant update (logo_path) on public.salons to authenticated;

CREATE OR REPLACE FUNCTION public.public_salon(p_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    'logo_path', s.logo_path,
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
      from public.members m where m.salon_id = s.id and m.active and m.bookable_online), '[]'::jsonb),
    'photos', coalesce((
      select jsonb_agg(ph.path order by ph.sort, ph.created_at)
      from public.salon_photos ph where ph.salon_id = s.id), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'closed', h.closed,
                                          'ranges', coalesce((select jsonb_agg(jsonb_build_array(r.start_min, r.end_min) order by r.start_min)
                                                              from public.opening_ranges r where r.salon_id = h.salon_id and r.weekday = h.weekday), '[]'::jsonb)) order by h.weekday)
      from public.opening_hours h where h.salon_id = s.id), '[]'::jsonb)
  )
  from public.salons s
  where s.slug = lower(p_slug) and s.deleted_at is null
$function$;
