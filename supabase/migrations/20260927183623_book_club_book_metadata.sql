alter table public.books
  add column if not exists description text,
  add column if not exists original_title text,
  add column if not exists published_year integer;
