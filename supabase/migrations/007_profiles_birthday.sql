-- Replace age with birthday so age updates over time.
alter table public.profiles
  add column if not exists birthday date;

alter table public.profiles
  drop column if exists age;

comment on column public.profiles.birthday is 'User date of birth (YYYY-MM-DD). Age is derived from this.';
