-- Taglendo · gestionale: utenze (titolari e barbieri dei saloni) e amministratori (chi gestisce Taglendo) sono due cose diverse.
-- Dei clienti finali non c'è niente qui: sono persone dei saloni, non utenze.
create function public.admin_users(p_q text default null, p_status text default 'all', p_sort text default 'access', p_dir text default 'desc', p_limit int default 25, p_offset int default 0)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_dir text := case when lower(coalesce(p_dir, 'desc')) = 'asc' then 'asc' else 'desc' end;
  v_sort text := case when p_sort in ('name', 'salon', 'created') then p_sort else 'access' end;
begin
  perform private.require_admin();
  return (
    with staff as (
      -- una riga per ogni posto in un salone
      select m.id as row_id, m.user_id, m.name, m.role::text as role, m.active,
             coalesce(u.email, m.invite_email) as email,
             s.id as salon_id, s.name as salon_name, s.slug as salon_slug, s.suspended_at,
             u.last_sign_in_at, u.created_at, u.banned_until is not null and u.banned_until > now() as blocked,
             u.email_confirmed_at is not null as confirmed
      from public.members m
      join public.salons s on s.id = m.salon_id and s.deleted_at is null
      left join auth.users u on u.id = m.user_id
    ),
    base as (
      select st.*,
             exists (select 1 from public.platform_admins a where a.user_id = st.user_id) as is_admin,
             (case
                when st.blocked then 'blocked'
                when st.user_id is null then 'invited'
                when not st.active then 'inactive'
                when not st.confirmed then 'unconfirmed'
                else 'active' end) as state
      from staff st
    ),
    filtered as (
      select * from base b
      where (v_q is null
             or b.name ilike '%' || v_q || '%' or coalesce(b.email, '') ilike '%' || v_q || '%' or coalesce(b.salon_name, '') ilike '%' || v_q || '%')
        and (coalesce(p_status, 'all') = 'all'
             or (p_status in ('owner', 'barber') and b.role = p_status)
             or b.state = p_status)
    )
    select jsonb_build_object(
      'total', (select count(*) from filtered),
      'rows', coalesce((
        select jsonb_agg(to_jsonb(r)) from (
          select * from filtered
          order by
            case when v_sort = 'name' and v_dir = 'asc' then lower(name) end asc,
            case when v_sort = 'name' and v_dir = 'desc' then lower(name) end desc,
            case when v_sort = 'salon' and v_dir = 'asc' then lower(coalesce(salon_name, '')) end asc,
            case when v_sort = 'salon' and v_dir = 'desc' then lower(coalesce(salon_name, '')) end desc,
            case when v_sort = 'created' and v_dir = 'asc' then coalesce(created_at, 'epoch'::timestamptz) end asc,
            case when v_sort = 'created' and v_dir = 'desc' then coalesce(created_at, 'epoch'::timestamptz) end desc,
            case when v_sort = 'access' and v_dir = 'asc' then coalesce(last_sign_in_at, 'epoch'::timestamptz) end asc,
            case when v_sort = 'access' and v_dir = 'desc' then coalesce(last_sign_in_at, 'epoch'::timestamptz) end desc,
            lower(name), row_id
          limit v_limit offset v_offset
        ) r), '[]'::jsonb)
    )
  );
end
$$;

-- Gli amministratori: chi può entrare nel gestionale di Taglendo.
create function public.admin_admins()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.added_at)
    from (
      select a.user_id, a.email, a.created_at as added_at, u.last_sign_in_at, u.created_at,
             (u.banned_until is not null and u.banned_until > now()) as blocked,
             a.user_id = (select auth.uid()) as self,
             (select m.name from public.members m where m.user_id = a.user_id order by m.role limit 1) as name
      from public.platform_admins a
      join auth.users u on u.id = a.user_id
    ) r), '[]'::jsonb);
end
$$;

-- Blocca / sblocca l'accesso di un'utenza: non può più entrare, le sessioni aperte si chiudono.
-- Gli amministratori non si bloccano da qui (prima si tolgono dagli amministratori).
create function public.admin_set_user_blocked(p_user uuid, p_blocked boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_user = (select auth.uid()) or exists (select 1 from public.platform_admins a where a.user_id = p_user) then
    raise exception 'Un amministratore non si blocca da qui' using errcode = '22023';
  end if;
  if p_blocked and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Scrivi il motivo del blocco' using errcode = '22023';
  end if;
  update auth.users set banned_until = case when p_blocked then 'infinity'::timestamptz else null end where id = p_user;
  if not found then raise exception 'Utenza non trovata' using errcode = 'P0002'; end if;
  if p_blocked then
    delete from auth.sessions where user_id = p_user;
  end if;
  perform private.admin_log(null, case when p_blocked then 'utente_bloccato' else 'utente_sbloccato' end,
    jsonb_build_object('user', p_user, 'email', (select email from auth.users where id = p_user), 'reason', left(p_reason, 300)));
end
$$;

-- Chi può entrare nel gestionale: si aggiunge un account che esiste già (per email) e si toglie.
create function public.admin_add_admin(p_email text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  perform private.require_admin();
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    raise exception 'Nessun account con questa email' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.platform_admins where user_id = v_user) then
    raise exception 'È già un amministratore' using errcode = '23505';
  end if;
  insert into public.platform_admins (user_id, email) values (v_user, v_email);
  perform private.admin_log(null, 'admin_aggiunto', jsonb_build_object('user', v_user, 'email', v_email));
end
$$;

create function public.admin_remove_admin(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text;
begin
  perform private.require_admin();
  if p_user = (select auth.uid()) then
    raise exception 'Non puoi togliere te stesso' using errcode = '22023';
  end if;
  delete from public.platform_admins where user_id = p_user returning email into v_email;
  if not found then raise exception 'Non è un amministratore' using errcode = 'P0002'; end if;
  perform private.admin_log(null, 'admin_rimosso', jsonb_build_object('user', p_user, 'email', v_email));
end
$$;

do $$
declare f text;
begin
  foreach f in array array['public.admin_users(text, text, text, text, int, int)', 'public.admin_admins()', 'public.admin_set_user_blocked(uuid, boolean, text)', 'public.admin_add_admin(text)', 'public.admin_remove_admin(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
