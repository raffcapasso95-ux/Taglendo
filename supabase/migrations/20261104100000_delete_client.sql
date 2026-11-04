-- Eliminazione di un cliente su sua richiesta (docs/04-regole.md, privacy).
-- Solo il titolare. Gli appuntamenti futuri vengono annullati dal salone; quelli passati restano
-- negli incassi senza nome (clients → appointments.client_id è "on delete set null").
create function public.delete_client(p_client uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_salon uuid;
  v_email text;
  v_cancelled int;
begin
  select c.salon_id, c.email into v_salon, v_email from public.clients c where c.id = p_client;
  if v_salon is null or not private.is_owner(v_salon) then
    raise exception 'Cliente non trovato' using errcode = '42501';
  end if;

  update public.appointments
     set status = 'annullato', cancelled_by = 'salone'
   where client_id = p_client and salon_id = v_salon and status = 'confermato' and ends_at > now();
  get diagnostics v_cancelled = row_count;

  -- codici di prenotazione ancora in giro con la sua email
  if v_email is not null then
    delete from public.booking_codes where salon_id = v_salon and lower(email) = lower(v_email);
  end if;

  delete from public.clients where id = p_client and salon_id = v_salon;
  return v_cancelled;
end;
$$;
revoke all on function public.delete_client(uuid) from public, anon;
grant execute on function public.delete_client(uuid) to authenticated;
