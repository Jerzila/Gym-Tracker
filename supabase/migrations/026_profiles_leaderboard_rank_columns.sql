-- Denormalized rank fields for social leaderboard (read from profiles only in app).
alter table public.profiles
  add column if not exists overall_rank text not null default 'Newbie I',
  add column if not exists overall_percentile double precision not null default 96.6,
  add column if not exists rank_badge text not null default 'newbie';

comment on column public.profiles.overall_rank is 'Full label e.g. Newbie I, Elite II (synced from rankings)';
comment on column public.profiles.overall_percentile is 'Numeric Top X% value for sorting; lower = stronger';
comment on column public.profiles.rank_badge is 'Badge image slug e.g. newbie, elite (synced from rankings)';

-- Backfill from existing rankings rows (numeric percentile parsed from Top X% label).
update public.profiles p
set
  overall_rank = r.overall_rank_label,
  rank_badge = r.overall_rank_slug,
  overall_percentile = coalesce(
    (regexp_match(r.overall_top_percentile_label, 'Top[[:space:]]*([0-9.]+)[[:space:]]*%', 'i'))[1]::double precision,
    96.6
  )
from public.rankings r
where p.id = r.user_id;
