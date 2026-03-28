-- Denormalized stats for multi-category friends leaderboard (synced from workouts in recalculateUserRankings).
alter table public.profiles
  add column if not exists total_volume double precision not null default 0,
  add column if not exists total_prs integer not null default 0,
  add column if not exists workouts_last_30_days integer not null default 0;

comment on column public.profiles.total_volume is 'Lifetime volume kg (weight × reps per set), for social leaderboard';
comment on column public.profiles.total_prs is 'Lifetime PR event count (same logic as account stats)';
comment on column public.profiles.workouts_last_30_days is 'Workout session rows in the last 30 days (rolling from UTC date)';
