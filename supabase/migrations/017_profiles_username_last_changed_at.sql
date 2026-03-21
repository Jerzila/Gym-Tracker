-- Track last manual username change (7-day cooldown for user-initiated updates)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_last_changed_at timestamptz;

-- Existing rows keep NULL (auto-assigned usernames; first manual change allowed immediately)
