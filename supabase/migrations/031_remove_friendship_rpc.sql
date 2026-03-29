-- Atomically delete both directed friendship rows; bypasses RLS so removal always clears the pair.

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
end;
$$;

revoke all on function public.remove_friendship(uuid) from public;
grant execute on function public.remove_friendship(uuid) to authenticated;
