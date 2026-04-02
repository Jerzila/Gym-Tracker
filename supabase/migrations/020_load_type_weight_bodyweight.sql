-- Rename legacy load_type "bilateral" → "weight"; add "bodyweight".
update public.exercises
set load_type = 'weight'
where load_type = 'bilateral';

alter table public.exercises
  alter column load_type set default 'weight';

alter table public.exercises
  drop constraint if exists exercises_load_type_check;

alter table public.exercises
  add constraint exercises_load_type_check
  check (load_type in ('weight', 'unilateral', 'bodyweight'));
