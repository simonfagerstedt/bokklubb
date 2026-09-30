-- Suggestions that weren't picked can be hidden from the main list instead
-- of piling up forever, while staying available in a "Hidden suggestions"
-- panel (admin-only to hide/unhide, matching the other curation actions).

alter table public.books
  drop constraint books_status_check;

alter table public.books
  add constraint books_status_check
  check (status in ('suggested', 'current', 'read', 'hidden'));
