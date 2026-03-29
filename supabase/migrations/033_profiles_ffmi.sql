-- Optional FFMI and body fat % from dashboard calculator (stored on profile).
alter table public.profiles
  add column if not exists ffmi double precision,
  add column if not exists body_fat_percent double precision;

comment on column public.profiles.ffmi is 'Fat-free mass index; set when user runs FFMI calculator on dashboard';
comment on column public.profiles.body_fat_percent is 'Body fat % at time of last FFMI calculation';
