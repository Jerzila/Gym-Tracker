-- Add user_id to all tables for user isolation.
-- Use nullable for existing rows; RLS will hide rows where user_id IS NULL from everyone.
-- New inserts must set user_id from auth.uid().

-- exercises
alter table public.exercises
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists exercises_user_id_idx on public.exercises(user_id);

-- workouts
alter table public.workouts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists workouts_user_id_idx on public.workouts(user_id);

-- bodyweight_logs
alter table public.bodyweight_logs
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists bodyweight_logs_user_id_idx on public.bodyweight_logs(user_id);

-- Drop existing permissive policies
drop policy if exists "Allow all on exercises" on public.exercises;
drop policy if exists "Allow all on workouts" on public.workouts;
drop policy if exists "Allow all on sets" on public.sets;
drop policy if exists "Allow all on bodyweight_logs" on public.bodyweight_logs;

-- exercises: user can only access their own rows
create policy "exercises_select_own" on public.exercises for select using (user_id = auth.uid());
create policy "exercises_insert_own" on public.exercises for insert with check (user_id = auth.uid());
create policy "exercises_update_own" on public.exercises for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exercises_delete_own" on public.exercises for delete using (user_id = auth.uid());

-- workouts: user can only access their own rows
create policy "workouts_select_own" on public.workouts for select using (user_id = auth.uid());
create policy "workouts_insert_own" on public.workouts for insert with check (user_id = auth.uid());
create policy "workouts_update_own" on public.workouts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "workouts_delete_own" on public.workouts for delete using (user_id = auth.uid());

-- sets: access only via workout owned by user
create policy "sets_select_own" on public.sets for select
  using (exists (select 1 from public.workouts w where w.id = sets.workout_id and w.user_id = auth.uid()));
create policy "sets_insert_own" on public.sets for insert
  with check (exists (select 1 from public.workouts w where w.id = sets.workout_id and w.user_id = auth.uid()));
create policy "sets_update_own" on public.sets for update
  using (exists (select 1 from public.workouts w where w.id = sets.workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.workouts w where w.id = sets.workout_id and w.user_id = auth.uid()));
create policy "sets_delete_own" on public.sets for delete
  using (exists (select 1 from public.workouts w where w.id = sets.workout_id and w.user_id = auth.uid()));

-- bodyweight_logs: user can only access their own rows
create policy "bodyweight_logs_select_own" on public.bodyweight_logs for select using (user_id = auth.uid());
create policy "bodyweight_logs_insert_own" on public.bodyweight_logs for insert with check (user_id = auth.uid());
create policy "bodyweight_logs_update_own" on public.bodyweight_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "bodyweight_logs_delete_own" on public.bodyweight_logs for delete using (user_id = auth.uid());
