-- Support "declined" status (UI wording) in addition to "rejected".

alter table public.friend_requests
  drop constraint if exists friend_requests_status_check;

alter table public.friend_requests
  add constraint friend_requests_status_check
  check (status in ('pending', 'accepted', 'rejected', 'declined'));

-- Normalize any existing "rejected" rows (optional; keeps one term)
-- Uncomment if you prefer a single status going forward.
-- update public.friend_requests set status = 'declined' where status = 'rejected';

