-- A member only has a display_name when they have a real name on file
-- (auth "full_name"). No more falling back to an email-derived name.
alter table public.members alter column display_name drop not null;

update public.members m
set display_name = null
where display_name = (select split_part(u.email, '@', 1) from auth.users u where u.id = m.id);

create or replace function public.handle_new_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
