-- Lets admins customize the faded book-cover collage behind the page,
-- previously a hardcoded list in page.tsx. Public read (the background
-- shows to signed-out visitors too), admin-only writes.

create table public.background_covers (
  id uuid primary key default gen_random_uuid(),
  position integer not null,
  cover_url text not null,
  title text,
  added_by uuid references public.members(id),
  created_at timestamptz not null default now()
);

alter table public.background_covers enable row level security;

create policy "Anyone can read background covers"
  on public.background_covers for select
  using (true);

create policy "Admins can insert background covers"
  on public.background_covers for insert to authenticated
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

create policy "Admins can update background covers"
  on public.background_covers for update to authenticated
  using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

create policy "Admins can delete background covers"
  on public.background_covers for delete to authenticated
  using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));

-- Seed with the covers that were previously hardcoded, so the collage
-- looks the same until an admin changes it.
insert into public.background_covers (position, cover_url, title, added_by)
select
  row_number() over () as position,
  cover_url,
  title,
  (select id from auth.users where email = 'simon.fagerstedt@gmail.com')
from (values
  ('https://covers.openlibrary.org/b/id/8467127-L.jpg', 'Pride and Prejudice'),
  ('https://covers.openlibrary.org/b/id/12927145-L.jpg', 'Circe'),
  ('https://covers.openlibrary.org/b/id/106239-L.jpg', 'Moby-Dick'),
  ('https://covers.openlibrary.org/b/id/12816990-L.jpg', 'Tomorrow, and Tomorrow, and Tomorrow'),
  ('https://covers.openlibrary.org/b/id/10616570-L.jpg', 'Nineteen Eighty-Four'),
  ('https://covers.openlibrary.org/b/id/9158360-L.jpg', 'Normal People'),
  ('https://covers.openlibrary.org/b/id/12622046-L.jpg', 'Crime and Punishment'),
  ('https://covers.openlibrary.org/b/id/15208263-L.jpg', 'Project Hail Mary'),
  ('https://covers.openlibrary.org/b/id/15098734-L.jpg', 'Jane Eyre'),
  ('https://covers.openlibrary.org/b/id/12866714-L.jpg', 'Babel'),
  ('https://covers.openlibrary.org/b/id/2325007-L.jpg', 'Frankenstein'),
  ('https://covers.openlibrary.org/b/id/15212562-L.jpg', 'The Overstory'),
  ('https://covers.openlibrary.org/b/id/8236262-L.jpg', 'Anna Karenina'),
  ('https://covers.openlibrary.org/b/id/12446638-L.jpg', 'The Song of Achilles'),
  ('https://covers.openlibrary.org/b/id/8238786-L.jpg', 'The Great Gatsby'),
  ('https://covers.openlibrary.org/b/id/13011435-L.jpg', 'Piranesi'),
  ('https://covers.openlibrary.org/b/id/13496213-L.jpg', 'Wuthering Heights'),
  ('https://covers.openlibrary.org/b/id/8815122-L.jpg', 'Educated'),
  ('https://covers.openlibrary.org/b/id/12622155-L.jpg', 'Dracula'),
  ('https://covers.openlibrary.org/b/id/6533183-L.jpg', 'Älskaren (L''Amant)'),
  ('https://covers.openlibrary.org/b/id/10871487-L.jpg', 'Klara and the Sun')
) as seed(cover_url, title);
