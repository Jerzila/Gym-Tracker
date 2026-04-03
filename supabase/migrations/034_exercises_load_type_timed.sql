-- Add timed (duration-based) exercises: planks, hangs, wall sits, etc.

alter table public.exercises
  drop constraint if exists exercises_load_type_check;

alter table public.exercises
  add constraint exercises_load_type_check
  check (load_type in ('weight', 'unilateral', 'bodyweight', 'timed'));
