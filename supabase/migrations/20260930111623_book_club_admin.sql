-- Admin flag on members, plus RLS so only admins can change books that are
-- already part of the club's history (currently reading / books read),
-- while suggesting and voting stay open to every signed-in member.

alter table public.members
  add column if not exists is_admin boolean not null default false;

-- Prevent a member from granting themselves admin through the "update own
-- profile" policy: a BEFORE UPDATE trigger reverts any change to is_admin
-- made over the authenticated REST path (auth.role() is only set there;
-- SQL run directly, e.g. from the dashboard or a migration, is unaffected).
create or replace function public.prevent_self_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.role() = 'authenticated' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists on_members_prevent_self_admin on public.members;
create trigger on_members_prevent_self_admin
  before update on public.members
  for each row execute function public.prevent_self_admin_change();

-- Replace the "any signed-in member can update books" policy: updating an
-- existing book (currently reading / books read) is now admin-only.
-- Suggesting a new book (insert) stays open to every signed-in member.
drop policy if exists "Signed-in members can update books" on public.books;

create policy "Admins can update books"
  on public.books for update to authenticated
  using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

create policy "Admins can delete books"
  on public.books for delete to authenticated
  using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

-- Make Simon an admin.
update public.members set is_admin = true
where id = (select id from auth.users where email = 'simon.fagerstedt@gmail.com');
