drop view if exists public.user_affiliate_codes;

alter table public.affiliate_user_claims add column if not exists updated_at timestamptz;

update public.affiliate_user_claims
set updated_at = created_at
where updated_at is null;

-- Valid code: insert or update. Invalid code: error; if user already has a claim, row unchanged.
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
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
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
    if exists (select 1 from public.affiliate_user_claims c where c.user_id = v_uid) then
      return jsonb_build_object('ok', false, 'error', 'invalid_code_unchanged');
    end if;
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  insert into public.affiliate_user_claims (user_id, affiliate_id, affiliate_code, created_at, updated_at)
  values (v_uid, v_aff_id, v_norm, now(), now())
  on conflict (user_id) do update set
    affiliate_id = excluded.affiliate_id,
    affiliate_code = excluded.affiliate_code,
    updated_at = now();

  update public.profiles
  set updated_at = now()
  where id = v_uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.claim_affiliate_code(text) from public;
grant execute on function public.claim_affiliate_code(text) to authenticated;
