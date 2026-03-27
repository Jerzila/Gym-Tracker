-- Allow authenticated users to search usernames.
-- Without this, RLS often blocks selecting other users' profiles.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_user_search" on public.profiles;

create policy "profiles_select_user_search"
on public.profiles
for select
using (auth.role() = 'authenticated');

