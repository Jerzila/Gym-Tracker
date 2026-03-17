-- Add new default categories: Forearms, Traps
-- Safe to run multiple times (uses ON CONFLICT).

do $$
declare
  uid uuid;
  default_names text[] := array['Forearms', 'Traps'];
  n text;
begin
  for uid in select id from auth.users
  loop
    foreach n in array default_names
    loop
      insert into public.categories (user_id, name)
      values (uid, n)
      on conflict (user_id, name) do nothing;
    end loop;
  end loop;
end $$;

