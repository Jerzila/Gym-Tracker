-- Add user-specific setup notes to exercises (e.g. seat height, grip, bench angle).
-- Notes are stored on the exercise row; RLS ensures user isolation via user_id.
alter table public.exercises
  add column if not exists notes text;

comment on column public.exercises.notes is 'User setup notes for this exercise (e.g. seat height, grip width). Persists with the exercise; does not affect workout history.';
