-- Replace generic "Arms" with separate Biceps/Triceps mapping.
-- Reassign old Arms exercises by name heuristics, then remove empty Arms category.

do $$
declare
  uid uuid;
  arms_cat_id uuid;
  biceps_cat_id uuid;
  triceps_cat_id uuid;
begin
  -- Ensure default categories needed for split exist per user
  for uid in select id from auth.users
  loop
    insert into public.categories (user_id, name)
    values (uid, 'Biceps')
    on conflict (user_id, name) do nothing;

    insert into public.categories (user_id, name)
    values (uid, 'Triceps')
    on conflict (user_id, name) do nothing;
  end loop;

  -- Reassign exercises currently in "Arms"
  for uid in select id from auth.users
  loop
    select id into arms_cat_id
    from public.categories
    where user_id = uid and lower(name) = 'arms'
    limit 1;

    if arms_cat_id is null then
      continue;
    end if;

    select id into biceps_cat_id
    from public.categories
    where user_id = uid and lower(name) = 'biceps'
    limit 1;

    select id into triceps_cat_id
    from public.categories
    where user_id = uid and lower(name) = 'triceps'
    limit 1;

    -- Triceps-like names
    update public.exercises
    set category_id = triceps_cat_id
    where user_id = uid
      and category_id = arms_cat_id
      and (
        lower(name) like '%tricep%'
        or lower(name) like '%pushdown%'
        or lower(name) like '%skull crusher%'
        or lower(name) like '%overhead%extension%'
        or lower(name) like '%dip%'
        or lower(name) like '%close grip bench%'
      );

    -- Biceps-like names
    update public.exercises
    set category_id = biceps_cat_id
    where user_id = uid
      and category_id = arms_cat_id
      and (
        lower(name) like '%bicep%'
        or lower(name) like '%curl%'
        or lower(name) like '%preacher%'
        or lower(name) like '%incline curl%'
        or lower(name) like '%hammer curl%'
      );

    -- Fallback remaining Arms exercises to Biceps
    update public.exercises
    set category_id = biceps_cat_id
    where user_id = uid
      and category_id = arms_cat_id;

    -- Remove Arms category if now unused
    delete from public.categories c
    where c.id = arms_cat_id
      and not exists (
        select 1 from public.exercises e where e.category_id = c.id
      );
  end loop;
end $$;

-- Update new-user default categories trigger (remove Traps and keep split arms)
create or replace function public.handle_new_user_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_names text[] := array[
    'Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders',
    'Forearms', 'Quads', 'Hamstrings', 'Glutes', 'Core'
  ];
  n text;
begin
  foreach n in array default_names
  loop
    insert into public.categories (user_id, name)
    values (new.id, n)
    on conflict (user_id, name) do nothing;
  end loop;
  return new;
end $$;

