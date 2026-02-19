-- Exercises: name, rep range for double progression
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rep_min int not null check (rep_min >= 1),
  rep_max int not null check (rep_max >= rep_min),
  created_at timestamptz not null default now()
);

-- Workouts: one row per session (same exercise, same date, same weight = one workout with multiple sets)
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  date date not null,
  weight decimal not null check (weight > 0),
  created_at timestamptz not null default now()
);

create index if not exists workouts_exercise_id_idx on public.workouts(exercise_id);
create index if not exists workouts_date_idx on public.workouts(date);

-- Sets: reps per set within a workout
create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  reps int not null check (reps >= 0)
);

create index if not exists sets_workout_id_idx on public.sets(workout_id);

-- Enable RLS (optional; use service role to bypass if auth not used)
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.sets enable row level security;

-- Allow all for anon/service role so app works without auth
create policy "Allow all on exercises" on public.exercises for all using (true) with check (true);
create policy "Allow all on workouts" on public.workouts for all using (true) with check (true);
create policy "Allow all on sets" on public.sets for all using (true) with check (true);
