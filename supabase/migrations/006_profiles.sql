-- User profiles for onboarding and insights (name, age, gender, country, body_weight, height).
-- One row per auth user; created on signup or backfilled for existing users.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  age smallint,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  country text,
  body_weight numeric(5,2),
  height numeric(5,2),
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_id_idx on public.profiles(id);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Create profile on new user signup (nullable fields; profile_completed = false).
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Backfill: one profile row per existing auth user that does not have one.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
