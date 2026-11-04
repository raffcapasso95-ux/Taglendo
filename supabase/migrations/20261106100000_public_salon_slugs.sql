-- Per la sitemap: i link dei saloni con una pagina da mostrare (non eliminati e con almeno un servizio).
-- Restituisce solo i link, già pubblici.
create function public.public_salon_slugs()
returns setof text
language sql stable security definer set search_path = ''
as $$
  select s.slug
  from public.salons s
  where s.deleted_at is null
    and exists (select 1 from public.services v where v.salon_id = s.id and v.active)
  order by s.slug
$$;
revoke all on function public.public_salon_slugs() from public;
grant execute on function public.public_salon_slugs() to anon, authenticated;
