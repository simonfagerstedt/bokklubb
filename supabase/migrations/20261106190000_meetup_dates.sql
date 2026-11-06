-- Meetup date poll: members suggest days for the next meetup and vote for
-- every day they can make (several votes per member are fine). When an
-- admin promotes a suggestion to current, or finishes the vote, the day
-- with most votes becomes the current book/movie's meet_on and the poll
-- is cleared.

alter table public.books add column if not exists meet_on date;

create table public.meetup_dates (
  id uuid primary key default gen_random_uuid(),
  meet_on date not null unique,
  suggested_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.meetup_date_votes (
  meetup_date_id uuid not null references public.meetup_dates (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meetup_date_id, member_id)
);

alter table public.meetup_dates enable row level security;
alter table public.meetup_date_votes enable row level security;

create policy "Meetup dates are publicly readable"
  on public.meetup_dates for select to anon, authenticated using (true);

create policy "Meetup date votes are publicly readable"
  on public.meetup_date_votes for select to anon, authenticated using (true);

create policy "Members can suggest meetup dates"
  on public.meetup_dates for insert to authenticated
  with check (suggested_by = auth.uid());

-- Your own suggestion, or any as admin (finishing the vote and "reset"
-- delete them all; their votes go with them through the cascade).
create policy "Members remove their own meetup dates, admins any"
  on public.meetup_dates for delete to authenticated
  using (
    suggested_by = auth.uid()
    or exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin)
  );

create policy "Members can vote for meetup dates"
  on public.meetup_date_votes for insert to authenticated
  with check (member_id = auth.uid());

create policy "Members can remove their own meetup date vote"
  on public.meetup_date_votes for delete to authenticated
  using (member_id = auth.uid());
