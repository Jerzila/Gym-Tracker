-- Store average set weight per workout session (for graphs + history when weights vary).

alter table public.workouts
add column if not exists average_weight double precision;

create index if not exists workouts_user_id_exercise_id_avgweight_date_idx
on public.workouts (user_id, exercise_id, date, average_weight);

