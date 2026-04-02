-- Advanced logging: store weight per set (while keeping workouts.weight for legacy/display).

alter table public.sets
add column if not exists weight double precision;

create index if not exists sets_workout_id_weight_idx on public.sets (workout_id, weight);

