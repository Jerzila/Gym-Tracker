-- Categories: muscle groups, one per user
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists categories_user_id_idx on public.categories(user_id);

alter table public.categories enable row level security;

create policy "categories_select_own" on public.categories for select using (user_id = auth.uid());
create policy "categories_insert_own" on public.categories for insert with check (user_id = auth.uid());
create policy "categories_update_own" on public.categories for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories_delete_own" on public.categories for delete using (user_id = auth.uid());

-- Add category_id to exercises (nullable first for backfill)
alter table public.exercises
  add column if not exists category_id uuid references public.categories(id) on delete restrict;

create index if not exists exercises_category_id_idx on public.exercises(category_id);

-- Backfill: create default categories for every user that has exercises, then assign exercises
do $$
declare
  uid uuid;
  cat_chest_id uuid;
  default_names text[] := array['Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders', 'Quads', 'Hamstrings', 'Glutes', 'Core'];
  n text;
begin
  for uid in select distinct user_id from public.exercises where user_id is not null
  loop
    -- Insert default categories for this user (ignore if already exist)
    foreach n in array default_names
    loop
      insert into public.categories (user_id, name)
      values (uid, n)
      on conflict (user_id, name) do nothing;
    end loop;
    -- Set first category (Chest) for any exercises with null category_id
    select id into cat_chest_id from public.categories where user_id = uid and name = 'Chest' limit 1;
    if cat_chest_id is not null then
      update public.exercises set category_id = cat_chest_id where user_id = uid and category_id is null;
    end if;
  end loop;
end $$;

-- Now require category_id for exercises
alter table public.exercises alter column category_id set not null;

-- New user signup: create default categories once per user
create or replace function public.handle_new_user_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_names text[] := array['Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders', 'Quads', 'Hamstrings', 'Glutes', 'Core'];
  n text;
begin
  foreach n in array default_names
  loop
    insert into public.categories (user_id, name) values (new.id, n);
  end loop;
  return new;
end $$;

-- Trigger on auth.users (Supabase allows this in migrations)
drop trigger if exists on_auth_user_created_categories on auth.users;
create trigger on_auth_user_created_categories
  after insert on auth.users
  for each row execute function public.handle_new_user_categories();
