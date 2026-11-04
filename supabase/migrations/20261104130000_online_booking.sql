-- Prenotazione online: codice via email e conferma, tutto in funzioni atomiche.
-- Le chiama solo il server con la chiave di servizio (service_role): ad anon e agli utenti non servono.

create index booking_codes_lookup_idx on public.booking_codes (salon_id, lower(email), created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Richiesta di un codice.
--  • non prima di 60 secondi dall'ultimo (status 'wait');
--  • al massimo 5 richieste all'ora per la stessa email e lo stesso salone (status 'limit').
-- Il codice arriva già cifrato (HMAC): in tabella non c'è mai il codice in chiaro.
-- ─────────────────────────────────────────────────────────────
create function public.request_booking_code(p_salon uuid, p_email text, p_code_hash text, p_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_last timestamptz;
  v_count int;
begin
  delete from public.booking_codes where created_at < now() - interval '1 day';

  select max(created_at), count(*) filter (where created_at > now() - interval '1 hour')
    into v_last, v_count
    from public.booking_codes where salon_id = p_salon and lower(email) = v_email;

  if v_last is not null and v_last > now() - interval '60 seconds' then
    return jsonb_build_object('status', 'wait', 'wait_seconds', ceil(extract(epoch from (v_last + interval '60 seconds' - now())))::int);
  end if;
  if v_count >= 5 then
    return jsonb_build_object('status', 'limit');
  end if;

  insert into public.booking_codes (salon_id, email, code_hash, payload)
  values (p_salon, v_email, p_code_hash, p_payload);
  return jsonb_build_object('status', 'sent');
end
$$;
revoke all on function public.request_booking_code(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.request_booking_code(uuid, text, text, jsonb) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Controllo del codice: scade dopo 10 minuti, 5 tentativi, poi bisogna chiederne uno nuovo.
-- Con il codice giusto torna ciò che il cliente aveva scelto. Il codice si brucia solo a prenotazione
-- riuscita (consume_booking_code): se l'orario nel frattempo è stato preso, il cliente ne sceglie un altro
-- senza dover chiedere un codice nuovo.
-- ─────────────────────────────────────────────────────────────
create function public.check_booking_code(p_salon uuid, p_email text, p_code_hash text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v public.booking_codes%rowtype;
begin
  select * into v from public.booking_codes
   where salon_id = p_salon and lower(email) = lower(trim(p_email))
   order by created_at desc limit 1
   for update;
  if not found then
    return jsonb_build_object('status', 'none');
  end if;
  if v.expires_at < now() then
    delete from public.booking_codes where id = v.id;
    return jsonb_build_object('status', 'expired');
  end if;
  if v.attempts >= 5 then
    return jsonb_build_object('status', 'locked');
  end if;
  if v.code_hash <> p_code_hash then
    update public.booking_codes set attempts = attempts + 1 where id = v.id;
    return jsonb_build_object('status', 'wrong', 'remaining', 4 - v.attempts);
  end if;
  return jsonb_build_object('status', 'ok', 'payload', v.payload);
end
$$;
revoke all on function public.check_booking_code(uuid, text, text) from public, anon, authenticated;
grant execute on function public.check_booking_code(uuid, text, text) to service_role;

create function public.consume_booking_code(p_salon uuid, p_email text)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.booking_codes where salon_id = p_salon and lower(email) = lower(trim(p_email))
$$;
revoke all on function public.consume_booking_code(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_booking_code(uuid, text) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Conferma: ricontrolla tutto e crea cliente e appuntamento in un colpo solo.
--  • prenotazioni online attive; servizio attivo del salone;
--  • l'orario è tra quelli liberi per il pubblico (preavviso, anticipo, chiusure, pause);
--  • il cliente è quello con la stessa email nel salone, o uno nuovo;
--  • nome e prezzo del servizio si copiano nell'appuntamento.
-- Se qualcuno ha preso l'orario nel frattempo, il vincolo del database (23P01) o 'slot_taken'.
-- ─────────────────────────────────────────────────────────────
create function public.confirm_online_booking(
  p_salon uuid, p_service uuid, p_member uuid, p_starts timestamptz,
  p_name text, p_email text, p_phone text, p_marketing boolean
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_salon public.salons%rowtype;
  v_service public.services%rowtype;
  v_slot record;
  v_client uuid;
  v_appt public.appointments%rowtype;
  v_email text := lower(trim(p_email));
begin
  select * into v_salon from public.salons where id = p_salon and deleted_at is null;
  if not found or not v_salon.booking_online then
    raise exception 'booking_closed' using errcode = 'P0001';
  end if;
  select * into v_service from public.services where id = p_service and salon_id = p_salon and active;
  if not found then
    raise exception 'service_gone' using errcode = 'P0001';
  end if;

  select f.member_id, f.starts_at, f.ends_at into v_slot
    from public.free_slots(p_salon, p_service, p_member, ((p_starts at time zone v_salon.timezone)::date), 1, true) f
   where f.starts_at = p_starts
   order by (select m.chair_no from public.members m where m.id = f.member_id)
   limit 1;
  if not found then
    raise exception 'slot_taken' using errcode = 'P0001';
  end if;

  select id into v_client from public.clients where salon_id = p_salon and lower(email) = v_email order by created_at limit 1;
  if v_client is null then
    insert into public.clients (salon_id, name, phone, email, privacy_accepted_at, marketing_opt_in)
    values (p_salon, trim(p_name), nullif(trim(p_phone), ''), v_email, now(), coalesce(p_marketing, false))
    returning id into v_client;
  else
    update public.clients
       set phone = coalesce(phone, nullif(trim(p_phone), '')),
           privacy_accepted_at = coalesce(privacy_accepted_at, now()),
           marketing_opt_in = marketing_opt_in or coalesce(p_marketing, false)
     where id = v_client;
  end if;

  insert into public.appointments (salon_id, member_id, client_id, service_id, service_name, price_cents, starts_at, ends_at, source)
  values (p_salon, v_slot.member_id, v_client, v_service.id, v_service.name, v_service.price_cents, v_slot.starts_at, v_slot.ends_at, 'online')
  returning * into v_appt;

  return jsonb_build_object(
    'id', v_appt.id, 'public_code', v_appt.public_code, 'manage_token', v_appt.manage_token,
    'member_id', v_appt.member_id, 'client_id', v_client,
    'starts_at', v_appt.starts_at, 'ends_at', v_appt.ends_at,
    'service_name', v_appt.service_name, 'price_cents', v_appt.price_cents);
end
$$;
revoke all on function public.confirm_online_booking(uuid, uuid, uuid, timestamptz, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.confirm_online_booking(uuid, uuid, uuid, timestamptz, text, text, text, boolean) to service_role;
