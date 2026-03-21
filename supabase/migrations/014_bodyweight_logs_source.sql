-- Optional provenance for bodyweight entries (e.g. setup vs manual log)
alter table public.bodyweight_logs
  add column if not exists source text;
