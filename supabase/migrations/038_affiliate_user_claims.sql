-- Partner attribution: user_id + code in affiliate_user_claims (not on profiles).

create table if not exists public.affiliate_user_claims (
  user_id uuid not null primary key references public.profiles (id) on delete cascade,
  affiliate_id uuid not null references public.affiliates (id) on delete restrict,
  affiliate_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_user_claims_affiliate_id_idx
  on public.affiliate_user_claims (affiliate_id);

comment on table public.affiliate_user_claims is
  'One row per user who applied a valid partner code (via claim_affiliate_code).';

insert into public.affiliate_user_claims (user_id, affiliate_id, affiliate_code, created_at)
select
  p.id,
  p.affiliate_id,
  a.code,
  coalesce(p.affiliate_recorded_at, now())
from public.profiles p
inner join public.affiliates a on a.id = p.affiliate_id
where p.affiliate_id is not null
on conflict (user_id) do nothing;

drop index if exists public.profiles_affiliate_id_idx;
alter table public.profiles drop column if exists affiliate_id;
alter table public.profiles drop column if exists affiliate_recorded_at;

alter table public.affiliate_user_claims enable row level security;

drop policy if exists "affiliate_user_claims_select_own" on public.affiliate_user_claims;
create policy "affiliate_user_claims_select_own"
  on public.affiliate_user_claims for select
  to authenticated
  using (user_id = auth.uid());

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
  v_inserted int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if exists (select 1 from public.affiliate_user_claims c where c.user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;

  if p_raw is null or btrim(p_raw) = '' then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;

  v_norm := upper(btrim(p_raw));
  if length(v_norm) < 2 or length(v_norm) > 64 then
    return jsonb_build_object('ok', false, 'error', 'invalid_format');
  end if;

  v_aff_id := (
    select a.id
    from public.affiliates a
    where a.code = v_norm and a.active = true
    limit 1
  );

  if v_aff_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  insert into public.affiliate_user_claims (user_id, affiliate_id, affiliate_code)
  values (v_uid, v_aff_id, v_norm)
  on conflict (user_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return jsonb_build_object('ok', false, 'error', 'already_claimed');
  end if;

  update public.profiles
  set updated_at = now()
  where id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.claim_affiliate_code(text) from public;
grant execute on function public.claim_affiliate_code(text) to authenticated;
