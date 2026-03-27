create table if not exists public.rankings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  overall_score double precision not null default 0,
  overall_rank text not null default 'Newbie',
  overall_rank_label text not null default 'Newbie I',
  overall_rank_slug text not null default 'newbie',
  overall_tier text not null default 'I',
  overall_progress_to_next_pct int not null default 0,
  overall_next_rank_label text,
  overall_top_percentile_label text not null default 'Top 96.6%',
  muscle_scores jsonb not null default '{}'::jsonb,
  muscle_ranks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists rankings_updated_at_idx on public.rankings(updated_at desc);

alter table public.rankings enable row level security;

drop policy if exists "rankings_select_own" on public.rankings;
drop policy if exists "rankings_insert_own" on public.rankings;
drop policy if exists "rankings_update_own" on public.rankings;
drop policy if exists "rankings_delete_own" on public.rankings;

create policy "rankings_select_own"
on public.rankings
for select
using (auth.uid() = user_id);

create policy "rankings_insert_own"
on public.rankings
for insert
with check (auth.uid() = user_id);

create policy "rankings_update_own"
on public.rankings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "rankings_delete_own"
on public.rankings
for delete
using (auth.uid() = user_id);
