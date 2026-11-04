-- Eliminazione dell'account (C9, docs/04-regole.md).
-- Titolare: il salone va offline subito (deleted_at) e viene cancellato dopo 30 giorni.
-- Barbiere: perde solo il proprio accesso; il posto resta per lo storico degli appuntamenti.

create function public.request_account_deletion()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_salon record;
  v_salons int := 0;
begin
  if v_user is null then
    raise exception 'Accesso richiesto' using errcode = '42501';
  end if;

  for v_salon in
    select m.salon_id from public.members m
    join public.salons s on s.id = m.salon_id and s.deleted_at is null
    where m.user_id = v_user and m.role = 'owner'
  loop
    -- lo slug si libera subito: un salone nuovo può riprendere lo stesso indirizzo
    update public.salons
       set deleted_at = now(), booking_online = false,
           slug = left(slug, 40) || '-eliminato-' || left(id::text, 8)
     where id = v_salon.salon_id;
    -- niente appuntamenti futuri in un salone che non c'è più
    update public.appointments set status = 'annullato', cancelled_by = 'salone'
     where salon_id = v_salon.salon_id and status = 'confermato' and ends_at > now();
    v_salons := v_salons + 1;
  end loop;

  -- le notifiche del telefono non servono più; il barbiere perde il posto (resta per lo storico)
  delete from public.push_subscriptions where member_id in (select id from public.members where user_id = v_user);
  update public.members set active = false, user_id = null, invite_email = null, invite_token = null
   where user_id = v_user and role <> 'owner';
  return v_salons;
end;
$$;
revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

-- Il lavoro automatico: cancella davvero i saloni eliminati da più di 30 giorni.
create function public.purge_deleted_salons()
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_n int;
begin
  delete from public.salons where deleted_at is not null and deleted_at < now() - interval '30 days';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.purge_deleted_salons() from public, anon, authenticated;
grant execute on function public.purge_deleted_salons() to service_role;
