-- Reading / attendance status: each member's status for the current book
-- (book club) or next movie (movie club). No row means "none". The status
-- is keyed to the book/movie, so it starts over on its own when a new one
-- becomes current, and old answers never carry over.
--
--   planning  book club: reading or planning to read, and attending.
--             movie club: planning to attend the next meetup.
--   finished  book club only: finished the book and attending.

create table public.reading_status (
  book_id uuid not null references public.books (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  status text not null check (status in ('planning', 'finished')),
  updated_at timestamptz not null default now(),
  primary key (book_id, member_id)
);

alter table public.reading_status enable row level security;

create policy "Reading status is publicly readable"
  on public.reading_status for select to anon, authenticated using (true);

-- Members set only their own status, and only on the current item.
create policy "Members set their own reading status"
  on public.reading_status for insert to authenticated
  with check (
    member_id = auth.uid()
    and exists (
      select 1 from public.books b where b.id = book_id and b.status = 'current'
    )
  );

create policy "Members change their own reading status"
  on public.reading_status for update to authenticated
  using (member_id = auth.uid())
  with check (
    member_id = auth.uid()
    and exists (
      select 1 from public.books b where b.id = book_id and b.status = 'current'
    )
  );

create policy "Members clear their own reading status"
  on public.reading_status for delete to authenticated
  using (member_id = auth.uid());
