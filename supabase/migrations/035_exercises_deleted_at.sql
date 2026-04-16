-- Soft-delete exercises: hide from the main list while keeping workout history.

alter table public.exercises
  add column if not exists deleted_at timestamptz null;

create index if not exists exercises_user_id_deleted_at_idx
  on public.exercises (user_id)
  where deleted_at is not null;

comment on column public.exercises.deleted_at is
  'When set, the exercise is hidden from the exercises list but workouts remain.';
