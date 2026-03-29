-- Let the original sender set a declined/rejected outbound request back to pending
-- (unique on sender_id, receiver_id prevents inserting a second row).

drop policy if exists "friend_requests_update_sender_reopen_declined" on public.friend_requests;

create policy "friend_requests_update_sender_reopen_declined"
on public.friend_requests
for update
using (auth.uid() = sender_id and status in ('declined', 'rejected'))
with check (auth.uid() = sender_id and status = 'pending');
