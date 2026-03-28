-- Let users read overall strength rankings for accepted friends (social leaderboard).
drop policy if exists "rankings_select_friends" on public.rankings;

create policy "rankings_select_friends"
on public.rankings
for select
using (
  exists (
    select 1
    from public.friends f
    where f.user_id = auth.uid()
      and f.friend_id = rankings.user_id
  )
);
