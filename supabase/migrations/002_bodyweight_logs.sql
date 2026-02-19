-- Bodyweight logs: one row per log (weight on a given date)
create table if not exists public.bodyweight_logs (
  id uuid primary key default gen_random_uuid(),
  weight decimal not null check (weight > 0),
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists bodyweight_logs_date_idx on public.bodyweight_logs(date desc);

alter table public.bodyweight_logs enable row level security;
create policy "Allow all on bodyweight_logs" on public.bodyweight_logs for all using (true) with check (true);
