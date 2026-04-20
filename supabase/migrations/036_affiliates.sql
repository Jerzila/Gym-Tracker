-- Valid affiliate partners (codes are uppercase in DB; users may type any case).
-- Add rows via SQL Editor or service role, e.g.:
--   insert into public.affiliates (code, label) values ('LIFT2026', 'Example partner');

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint affiliates_code_format check (
    char_length(btrim(code)) >= 2
    and char_length(btrim(code)) <= 64
  )
);

-- Store normalized code (upper(trim)) on insert/update
create or replace function public.affiliates_normalize_code()
returns trigger
language plpgsql
as $$
begin
  new.code := upper(btrim(new.code));
  return new;
end;
$$;

drop trigger if exists affiliates_normalize_code_trigger on public.affiliates;
create trigger affiliates_normalize_code_trigger
  before insert or update of code on public.affiliates
  for each row execute function public.affiliates_normalize_code();

alter table public.profiles
  add column if not exists affiliate_id uuid references public.affiliates (id) on delete set null,
  add column if not exists affiliate_recorded_at timestamptz;

create index if not exists profiles_affiliate_id_idx on public.profiles (affiliate_id)
  where affiliate_id is not null;

alter table public.affiliates enable row level security;

-- No client policies: codes are validated only via claim_affiliate_code (SECURITY DEFINER).
-- Manage affiliates with service role or dashboard (bypass RLS).

comment on table public.affiliates is 'Partner codes for attribution only; not used for pricing.';
comment on column public.profiles.affiliate_id is 'Set once via claim_affiliate_code when user enters a valid code.';
comment on column public.profiles.affiliate_recorded_at is 'When affiliate_id was first set.';

-- Optional text → validate against affiliates → save on profile (first claim only).
create or replace function public.claim_affiliate_code(p_raw text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_norm text;
  v_aff_id uuid;
  v_updated int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if exists (select 1 from public.profiles p where p.id = v_uid and p.affiliate_id is not null) then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;

  if p_raw is null or btrim(p_raw) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;

  v_norm := upper(btrim(p_raw));
  if length(v_norm) < 2 or length(v_norm) > 64 then
    return jsonb_build_object('ok', false, 'error', 'invalid_format');
  end if;

  select a.id into v_aff_id
  from public.affiliates a
  where a.code = v_norm and a.active = true
  limit 1;

  if v_aff_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  update public.profiles
  set
    affiliate_id = v_aff_id,
    affiliate_recorded_at = now(),
    updated_at = now()
  where id = v_uid and affiliate_id is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.claim_affiliate_code(text) from public;
grant execute on function public.claim_affiliate_code(text) to authenticated;
