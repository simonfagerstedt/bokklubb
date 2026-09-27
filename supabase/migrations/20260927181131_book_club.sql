-- Book club schema: members, books (current/read/suggested), reviews and
-- suggestion votes.

-- One row per signed-in user, auto-created on signup (see trigger below).
create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  status text not null default 'suggested'
    check (status in ('suggested', 'current', 'read')),
  cover_url text,
  pitch text, -- why this was suggested
  added_by uuid references public.members (id) on delete set null,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  unique (book_id, member_id)
);

create table if not exists public.suggestion_votes (
  book_id uuid not null references public.books (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (book_id, member_id)
);

-- Auto-create a member row whenever someone signs up, using the part of
-- their email before the @ as a starter display name.
create or replace function public.handle_new_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'Member'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_member();

-- Row level security -------------------------------------------------------

alter table public.members enable row level security;
alter table public.books enable row level security;
alter table public.reviews enable row level security;
alter table public.suggestion_votes enable row level security;

-- Everyone (including anonymous visitors) can read the club's data.
create policy "Members are publicly readable"
  on public.members for select to anon, authenticated using (true);

create policy "Books are publicly readable"
  on public.books for select to anon, authenticated using (true);

create policy "Reviews are publicly readable"
  on public.reviews for select to anon, authenticated using (true);

create policy "Votes are publicly readable"
  on public.suggestion_votes for select to anon, authenticated using (true);

-- Signed-in members can manage their own profile row.
create policy "Members can update their own profile"
  on public.members for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Any signed-in member can suggest a book or update its status/cover as the
-- club reads it (simple shared-editing model for a small private club).
create policy "Signed-in members can add books"
  on public.books for insert to authenticated
  with check (added_by = auth.uid());

create policy "Signed-in members can update books"
  on public.books for update to authenticated using (true) with check (true);

-- Reviews and votes are always authored by the acting member.
create policy "Members can write their own reviews"
  on public.reviews for insert to authenticated
  with check (member_id = auth.uid());

create policy "Members can edit their own reviews"
  on public.reviews for update to authenticated
  using (member_id = auth.uid()) with check (member_id = auth.uid());

create policy "Members can delete their own reviews"
  on public.reviews for delete to authenticated
  using (member_id = auth.uid());

create policy "Members can vote for suggestions"
  on public.suggestion_votes for insert to authenticated
  with check (member_id = auth.uid());

create policy "Members can remove their own vote"
  on public.suggestion_votes for delete to authenticated
  using (member_id = auth.uid());

-- Seed data so the page has something to show before anyone signs in.
insert into public.books (title, author, status, pitch, finished_at)
values
  ('Klara and the Sun', 'Kazuo Ishiguro', 'current', null, null),
  ('Piranesi', 'Susanna Clarke', 'read', null, now() - interval '30 days'),
  ('The Overstory', 'Richard Powers', 'read', null, now() - interval '75 days'),
  ('Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 'suggested',
   'Great one for anyone who grew up on video games.', null),
  ('Babel', 'R. F. Kuang', 'suggested',
   'Been meaning to read this since it came out.', null)
on conflict do nothing;
