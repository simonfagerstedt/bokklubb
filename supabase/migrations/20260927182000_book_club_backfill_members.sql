-- The "auto-create a member row" trigger only fires for new signups.
-- Backfill member rows for any auth.users that existed before it was added.
insert into public.members (id, display_name)
select id, coalesce(split_part(email, '@', 1), 'Member')
from auth.users
on conflict (id) do nothing;
