-- Persistent strength metrics to enable fast, targeted recomputation

alter table public.workouts
add column if not exists effective_weight double precision,
add column if not exists estimated_1rm double precision;

create table if not exists public.exercise_prs (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  heaviest_logged_weight double precision not null default 0,
  best_estimated_1rm double precision not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create index if not exists exercise_prs_user_id_idx on public.exercise_prs(user_id);
create index if not exists exercise_prs_exercise_id_idx on public.exercise_prs(exercise_id);

alter table public.exercise_prs enable row level security;

drop policy if exists "exercise_prs_select_own" on public.exercise_prs;
drop policy if exists "exercise_prs_upsert_own" on public.exercise_prs;
drop policy if exists "exercise_prs_delete_own" on public.exercise_prs;

create policy "exercise_prs_select_own"
on public.exercise_prs
for select
using (auth.uid() = user_id);

create policy "exercise_prs_upsert_own"
on public.exercise_prs
for insert
with check (auth.uid() = user_id);

create policy "exercise_prs_delete_own"
on public.exercise_prs
for delete
using (auth.uid() = user_id);

-- Allow updates only for the owning user (covers upsert conflict updates).
create policy "exercise_prs_update_own"
on public.exercise_prs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
