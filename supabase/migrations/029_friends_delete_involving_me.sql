-- Allow either party to remove a friendship (delete both directed edges).

drop policy if exists "friends_delete_involving_me" on public.friends;

create policy "friends_delete_involving_me"
on public.friends
for delete
using (auth.uid() = user_id or auth.uid() = friend_id);
