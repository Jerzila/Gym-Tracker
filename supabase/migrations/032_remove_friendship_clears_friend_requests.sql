-- Unfriending left `friend_requests` rows in `accepted`, which blocked new sends (sendFriendRequest treats accepted as "already").

drop policy if exists "friend_requests_delete_involving_me" on public.friend_requests;

create policy "friend_requests_delete_involving_me"
on public.friend_requests
for delete
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create or replace function public.remove_friendship(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_friend_id is null or p_friend_id = auth.uid() then
    raise exception 'Invalid friend';
  end if;

  delete from public.friends
  where (user_id = auth.uid() and friend_id = p_friend_id)
     or (user_id = p_friend_id and friend_id = auth.uid());

  delete from public.friend_requests
  where (sender_id = auth.uid() and receiver_id = p_friend_id)
     or (sender_id = p_friend_id and receiver_id = auth.uid());
end;
$$;
