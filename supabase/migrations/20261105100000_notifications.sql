-- Fase 5: promemoria e avvisi.
-- reminder_sent_at: il promemoria del giorno prima parte una volta sola per appuntamento.
alter table public.appointments add column reminder_sent_at timestamptz;
create index appointments_reminder_idx on public.appointments (starts_at) where status = 'confermato' and reminder_sent_at is null;

-- Il riepilogo delle 8:00 parte una volta al giorno per ogni operatore.
create table public.summary_runs (
  member_id uuid not null references public.members on delete cascade,
  run_date date not null,
  primary key (member_id, run_date)
);
alter table public.summary_runs enable row level security;
-- nessuna policy: lo scrive e lo legge solo il server con la chiave di servizio.
revoke all on public.summary_runs from anon, authenticated;
