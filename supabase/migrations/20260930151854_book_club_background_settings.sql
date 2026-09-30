-- Admin-configurable layout for the background collage: how many tiles
-- wide it is at each screen-size breakpoint, and the gap between tiles
-- (as a % of each tile's own width). Always exactly one row.

create table public.background_settings (
  id boolean primary key default true,
  cols_mobile integer not null default 4,
  cols_tablet integer not null default 7,
  cols_desktop integer not null default 9,
  gap_percent integer not null default 30,
  updated_at timestamptz not null default now(),
  constraint background_settings_single_row check (id),
  constraint background_settings_cols_mobile_range check (cols_mobile between 1 and 20),
  constraint background_settings_cols_tablet_range check (cols_tablet between 1 and 20),
  constraint background_settings_cols_desktop_range check (cols_desktop between 1 and 20),
  constraint background_settings_gap_range check (gap_percent between 0 and 100)
);

insert into public.background_settings (id, cols_mobile, cols_tablet, cols_desktop, gap_percent)
values (true, 4, 7, 9, 30);

alter table public.background_settings enable row level security;

create policy "Anyone can read background settings"
  on public.background_settings for select
  using (true);

create policy "Admins can update background settings"
  on public.background_settings for update to authenticated
  using (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin))
  with check (exists (select 1 from public.members m where m.id = auth.uid() and m.is_admin));
