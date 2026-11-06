-- Taglendo · ridisegno novembre 2026, passo 3: avatar del cliente e prezzo fatto per l'appuntamento

-- ── Avatar: colore delle iniziali (0–4) e foto facoltativa ───────────────────────────────
-- avatar_color null = il colore si ricava dal nome (sempre lo stesso per lo stesso cliente).
alter table public.clients
  add column avatar_color smallint check (avatar_color between 0 and 4),
  add column photo_path text check (char_length(photo_path) <= 200);

-- la rubrica si legge per colonne (vedi init): le nuove non fanno eccezione
grant select (avatar_color, photo_path) on public.clients to authenticated;

create or replace view public.clients_visible
with (security_barrier = true)
as
  select c.id, c.salon_id, c.name,
         case when private.can(c.salon_id, 'contacts') then c.phone end as phone,
         case when private.can(c.salon_id, 'contacts') then c.email end as email,
         c.note, c.privacy_accepted_at, c.marketing_opt_in, c.created_at,
         c.avatar_color, c.photo_path
  from public.clients c
  where private.is_member(c.salon_id);

-- ── Foto dei clienti: dato personale, bucket privato ─────────────────────────────────────
-- Percorso: <salon_id>/<client_id>.jpg. Vede la foto chi è del salone; la cambia chi può fissare appuntamenti.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-photos', 'client-photos', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy client_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'client-photos'
         and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and private.is_member(((storage.foldername(name))[1])::uuid));
create policy client_photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'client-photos'
              and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
              and private.can(((storage.foldername(name))[1])::uuid, 'edit'));
create policy client_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'client-photos'
         and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and private.can(((storage.foldername(name))[1])::uuid, 'edit'));
create policy client_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'client-photos'
         and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and private.can(((storage.foldername(name))[1])::uuid, 'edit'));

-- ── Prezzo fatto ─────────────────────────────────────────────────────────────────────────
-- price_cents diventa il prezzo che il cliente paga davvero (email, riepiloghi e incassi lo usano già).
-- list_price_cents è il prezzo di listino copiato alla prenotazione, per il confronto («24 € invece di 30 €»).
alter table public.appointments
  add column list_price_cents int check (list_price_cents >= 0),
  add column price_note text check (char_length(price_note) <= 60);

update public.appointments set list_price_cents = price_cents where list_price_cents is null;

-- chi inserisce senza dirlo (prenotazione online, import) ottiene che il prezzo di listino sia quello pagato
create function private.appointment_list_price() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.list_price_cents := coalesce(new.list_price_cents, new.price_cents);
  return new;
end;
$$;
create trigger appointments_list_price before insert on public.appointments
  for each row execute function private.appointment_list_price();
