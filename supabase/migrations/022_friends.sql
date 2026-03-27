-- Friend requests + friendships (social v1).

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  constraint friend_requests_sender_receiver_distinct check (sender_id <> receiver_id)
);

create unique index if not exists friend_requests_sender_receiver_unique
  on public.friend_requests(sender_id, receiver_id);

create index if not exists friend_requests_receiver_status_created_at_idx
  on public.friend_requests(receiver_id, status, created_at desc);

create index if not exists friend_requests_sender_status_created_at_idx
  on public.friend_requests(sender_id, status, created_at desc);

create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friends_user_friend_distinct check (user_id <> friend_id)
);

create unique index if not exists friends_user_friend_unique
  on public.friends(user_id, friend_id);

create index if not exists friends_user_created_at_idx
  on public.friends(user_id, created_at desc);

alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;

drop policy if exists "friend_requests_select_involving_me" on public.friend_requests;
drop policy if exists "friend_requests_insert_as_sender" on public.friend_requests;
drop policy if exists "friend_requests_update_as_receiver" on public.friend_requests;

create policy "friend_requests_select_involving_me"
on public.friend_requests
for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "friend_requests_insert_as_sender"
on public.friend_requests
for insert
with check (auth.uid() = sender_id);

create policy "friend_requests_update_as_receiver"
on public.friend_requests
for update
using (auth.uid() = receiver_id)
with check (auth.uid() = receiver_id);

drop policy if exists "friends_select_own" on public.friends;
drop policy if exists "friends_insert_own" on public.friends;

create policy "friends_select_own"
on public.friends
for select
using (auth.uid() = user_id);

create policy "friends_insert_own"
on public.friends
for insert
with check (auth.uid() = user_id);

-- Accepting a request must add both (A->B) and (B->A) rows.
-- We do that via a SECURITY DEFINER RPC so the receiver can accept.
create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid;
  v_receiver uuid;
  v_status text;
begin
  select sender_id, receiver_id, status
    into v_sender, v_receiver, v_status
  from public.friend_requests
  where id = p_request_id
  for update;

  if v_sender is null then
    raise exception 'Friend request not found';
  end if;

  if auth.uid() is null or auth.uid() <> v_receiver then
    raise exception 'Not authorized to accept this request';
  end if;

  if v_status <> 'pending' then
    return;
  end if;

  update public.friend_requests
  set status = 'accepted'
  where id = p_request_id;

  insert into public.friends(user_id, friend_id)
  values (v_sender, v_receiver), (v_receiver, v_sender)
  on conflict (user_id, friend_id) do nothing;
end;
$$;

revoke all on function public.accept_friend_request(uuid) from public;
grant execute on function public.accept_friend_request(uuid) to authenticated;
