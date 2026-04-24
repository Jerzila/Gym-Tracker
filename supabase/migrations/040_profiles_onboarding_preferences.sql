alter table public.profiles
  add column if not exists onboarding_main_goal text,
  add column if not exists onboarding_gym_experience text,
  add column if not exists onboarding_weekly_frequency text,
  add column if not exists onboarding_workout_length text,
  add column if not exists onboarding_app_experience text;

alter table public.profiles
  drop constraint if exists profiles_onboarding_main_goal_check;
alter table public.profiles
  add constraint profiles_onboarding_main_goal_check
  check (
    onboarding_main_goal is null
    or onboarding_main_goal in ('build_muscle', 'lose_fat', 'get_stronger', 'stay_consistent')
  );

alter table public.profiles
  drop constraint if exists profiles_onboarding_gym_experience_check;
alter table public.profiles
  add constraint profiles_onboarding_gym_experience_check
  check (
    onboarding_gym_experience is null
    or onboarding_gym_experience in ('just_starting', 'under_6_months', '6_24_months', '2_plus_years')
  );

alter table public.profiles
  drop constraint if exists profiles_onboarding_weekly_frequency_check;
alter table public.profiles
  add constraint profiles_onboarding_weekly_frequency_check
  check (
    onboarding_weekly_frequency is null
    or onboarding_weekly_frequency in ('1_2_days', '3_days', '4_days', '5_plus_days')
  );

alter table public.profiles
  drop constraint if exists profiles_onboarding_workout_length_check;
alter table public.profiles
  add constraint profiles_onboarding_workout_length_check
  check (
    onboarding_workout_length is null
    or onboarding_workout_length in ('20_30', '30_45', '45_60', '60_plus')
  );

alter table public.profiles
  drop constraint if exists profiles_onboarding_app_experience_check;
alter table public.profiles
  add constraint profiles_onboarding_app_experience_check
  check (
    onboarding_app_experience is null
    or onboarding_app_experience in ('recommendations', 'analytics', 'rankings', 'history')
  );
