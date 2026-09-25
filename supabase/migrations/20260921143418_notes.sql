-- Starter table so the home page has something to read from Supabase.
-- Replace with your own schema once you're up and running.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

-- Anyone (including anonymous visitors) can read notes.
-- Tighten this once you add auth-gated data.
create policy "Notes are publicly readable"
  on public.notes
  for select
  to anon, authenticated
  using (true);

insert into public.notes (title)
values ('Hello from Supabase 👋')
on conflict do nothing;
