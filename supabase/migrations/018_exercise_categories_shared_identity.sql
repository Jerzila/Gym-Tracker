-- Shared exercise identity across categories.
-- Introduces many-to-many mapping: exercises <-> categories.
-- Keeps legacy exercises.category_id for backwards compatibility with existing queries.

create table if not exists public.exercise_categories (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (exercise_id, category_id)
);

create index if not exists exercise_categories_category_id_idx
  on public.exercise_categories(category_id);

create index if not exists exercise_categories_exercise_id_idx
  on public.exercise_categories(exercise_id);

alter table public.exercise_categories enable row level security;

drop policy if exists "exercise_categories_select_own" on public.exercise_categories;
drop policy if exists "exercise_categories_insert_own" on public.exercise_categories;
drop policy if exists "exercise_categories_update_own" on public.exercise_categories;
drop policy if exists "exercise_categories_delete_own" on public.exercise_categories;

create policy "exercise_categories_select_own"
on public.exercise_categories
for select
using (
  exists (
    select 1
    from public.exercises e
    where e.id = exercise_categories.exercise_id
      and e.user_id = auth.uid()
  )
);

create policy "exercise_categories_insert_own"
on public.exercise_categories
for insert
with check (
  exists (
    select 1
    from public.exercises e
    join public.categories c on c.id = exercise_categories.category_id
    where e.id = exercise_categories.exercise_id
      and e.user_id = auth.uid()
      and c.user_id = auth.uid()
  )
);

create policy "exercise_categories_update_own"
on public.exercise_categories
for update
using (
  exists (
    select 1
    from public.exercises e
    where e.id = exercise_categories.exercise_id
      and e.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.exercises e
    join public.categories c on c.id = exercise_categories.category_id
    where e.id = exercise_categories.exercise_id
      and e.user_id = auth.uid()
      and c.user_id = auth.uid()
  )
);

create policy "exercise_categories_delete_own"
on public.exercise_categories
for delete
using (
  exists (
    select 1
    from public.exercises e
    where e.id = exercise_categories.exercise_id
      and e.user_id = auth.uid()
  )
);

-- Backfill mapping table from legacy exercises.category_id.
insert into public.exercise_categories (exercise_id, category_id)
select e.id, e.category_id
from public.exercises e
where e.category_id is not null
on conflict (exercise_id, category_id) do nothing;

-- Merge duplicate exercises (same user + same trimmed lowercase name) into one canonical record.
do $$
begin
  create temporary table tmp_exercise_canonical as
  select distinct on (e.user_id, lower(btrim(e.name)))
    e.user_id,
    lower(btrim(e.name)) as normalized_name,
    e.id as canonical_id
  from public.exercises e
  where e.user_id is not null
  order by e.user_id, lower(btrim(e.name)), e.created_at asc, e.id asc;

  -- Move workouts to canonical exercise ids.
  update public.workouts w
  set exercise_id = m.canonical_id
  from public.exercises e
  join tmp_exercise_canonical m
    on m.user_id = e.user_id
   and m.normalized_name = lower(btrim(e.name))
  where w.exercise_id = e.id
    and e.id <> m.canonical_id;

  -- Preserve category mappings from duplicates on canonical ids.
  insert into public.exercise_categories (exercise_id, category_id)
  select distinct m.canonical_id, ec.category_id
  from public.exercises e
  join tmp_exercise_canonical m
    on m.user_id = e.user_id
   and m.normalized_name = lower(btrim(e.name))
  join public.exercise_categories ec
    on ec.exercise_id = e.id
  on conflict (exercise_id, category_id) do nothing;

  -- Merge rep range / notes onto canonical records.
  with merged as (
    select
      m.canonical_id,
      min(e.rep_min) as rep_min_merged,
      max(e.rep_max) as rep_max_merged,
      (array_remove(array_agg(e.notes order by e.created_at asc), null))[1] as notes_merged
    from public.exercises e
    join tmp_exercise_canonical m
      on m.user_id = e.user_id
     and m.normalized_name = lower(btrim(e.name))
    group by m.canonical_id
  )
  update public.exercises e
  set rep_min = merged.rep_min_merged,
      rep_max = greatest(merged.rep_max_merged, merged.rep_min_merged),
      notes = coalesce(e.notes, merged.notes_merged)
  from merged
  where e.id = merged.canonical_id;

  -- Delete duplicate exercise rows after remapping.
  delete from public.exercises e
  using tmp_exercise_canonical m
  where e.user_id = m.user_id
    and lower(btrim(e.name)) = m.normalized_name
    and e.id <> m.canonical_id;
end $$;

-- Prevent creating duplicate exercises with the same name for one user.
create unique index if not exists exercises_user_name_ci_unique_idx
  on public.exercises(user_id, lower(btrim(name)));

-- Keep legacy exercises.category_id synced for compatibility.
create or replace function public.sync_exercise_category_on_exercise_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.category_id is not null then
    insert into public.exercise_categories (exercise_id, category_id)
    values (new.id, new.category_id)
    on conflict (exercise_id, category_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists tr_sync_exercise_category_on_exercise_insert on public.exercises;
create trigger tr_sync_exercise_category_on_exercise_insert
after insert on public.exercises
for each row execute function public.sync_exercise_category_on_exercise_write();

drop trigger if exists tr_sync_exercise_category_on_exercise_update on public.exercises;
create trigger tr_sync_exercise_category_on_exercise_update
after update of category_id on public.exercises
for each row execute function public.sync_exercise_category_on_exercise_write();

create or replace function public.sync_legacy_category_on_mapping_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  replacement_category_id uuid;
begin
  if tg_op = 'INSERT' then
    update public.exercises
    set category_id = coalesce(category_id, new.category_id)
    where id = new.exercise_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    select ec.category_id into replacement_category_id
    from public.exercise_categories ec
    where ec.exercise_id = old.exercise_id
    order by ec.created_at asc
    limit 1;

    update public.exercises
    set category_id = replacement_category_id
    where id = old.exercise_id
      and category_id = old.category_id;

    return old;
  end if;

  return null;
end $$;

drop trigger if exists tr_sync_legacy_category_on_mapping_insert on public.exercise_categories;
create trigger tr_sync_legacy_category_on_mapping_insert
after insert on public.exercise_categories
for each row execute function public.sync_legacy_category_on_mapping_change();

drop trigger if exists tr_sync_legacy_category_on_mapping_delete on public.exercise_categories;
create trigger tr_sync_legacy_category_on_mapping_delete
after delete on public.exercise_categories
for each row execute function public.sync_legacy_category_on_mapping_change();
