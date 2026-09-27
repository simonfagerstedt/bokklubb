-- Prefer the auth "full_name" (set at signup, e.g. via user metadata) over
-- an email-derived name when creating a member row.
create or replace function public.handle_new_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1),
      'Member'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill: give existing members their real name where auth metadata has
-- one and the member row is still using the email-derived fallback.
update public.members m
set display_name = trim(u.raw_user_meta_data ->> 'full_name')
from auth.users u
where m.id = u.id
  and nullif(trim(u.raw_user_meta_data ->> 'full_name'), '') is not null
  and m.display_name = split_part(u.email, '@', 1);
