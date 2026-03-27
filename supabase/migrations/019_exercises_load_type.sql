alter table public.exercises
add column if not exists load_type text not null default 'bilateral';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exercises_load_type_check'
  ) then
    alter table public.exercises
    add constraint exercises_load_type_check
    check (load_type in ('bilateral', 'unilateral'));
  end if;
end $$;
