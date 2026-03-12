-- Indexes for insights and dashboard queries: filter by user_id and date range.
-- Ensures .eq("user_id", user.id).gte("date", start).lte("date", end) and similar are fast.
create index if not exists workouts_user_id_date_idx on public.workouts (user_id, date);
create index if not exists workouts_user_id_exercise_id_date_idx on public.workouts (user_id, exercise_id, date);

-- Sets are often filtered by workout_id (from workouts already filtered by user/date).
create index if not exists sets_workout_id_idx on public.sets (workout_id);
