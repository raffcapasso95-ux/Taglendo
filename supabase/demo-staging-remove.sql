-- Toglie i saloni demo dello staging (Il Rasoio e Due Torri) e i loro utenti.
delete from public.salons where id::text like '5a400000-%';
delete from auth.identities where user_id::text like 'a4000000-%';
delete from auth.users where id::text like 'a4000000-%';
