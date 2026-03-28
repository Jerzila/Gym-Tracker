-- Allow reading a friend's workouts, sets, and exercises (for aggregates / friend profile stats).
drop policy if exists "workouts_select_friends" on public.workouts;
drop policy if exists "sets_select_friend_workouts" on public.sets;
drop policy if exists "exercises_select_friends" on public.exercises;

create policy "workouts_select_friends"
on public.workouts
for select
using (
  exists (
    select 1
    from public.friends f
    where f.user_id = auth.uid()
      and f.friend_id = workouts.user_id
  )
);

create policy "sets_select_friend_workouts"
on public.sets
for select
using (
  exists (
    select 1
    from public.workouts w
    join public.friends f
      on f.user_id = auth.uid()
     and f.friend_id = w.user_id
    where w.id = sets.workout_id
  )
);

create policy "exercises_select_friends"
on public.exercises
for select
using (
  exists (
    select 1
    from public.friends f
    where f.user_id = auth.uid()
      and f.friend_id = exercises.user_id
  )
);
