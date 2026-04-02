-- Average estimated 1RM per workout session (computed from all logged sets).
-- This is the metric used for rankings, graphs, and exercise tracking.

alter table public.workouts
add column if not exists average_estimated_1rm double precision;

create index if not exists workouts_user_id_exercise_id_avg1rm_date_idx
on public.workouts (user_id, exercise_id, date, average_estimated_1rm);

