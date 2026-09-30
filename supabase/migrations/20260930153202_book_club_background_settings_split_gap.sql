-- Split the single "gap_percent" into independent horizontal (column) and
-- vertical (row) gap settings, since a single CSS `gap` value was forcing
-- both to match.

alter table public.background_settings
  add column gap_x_percent integer,
  add column gap_y_percent integer;

update public.background_settings
  set gap_x_percent = gap_percent,
      gap_y_percent = gap_percent;

alter table public.background_settings
  alter column gap_x_percent set not null,
  alter column gap_y_percent set not null,
  alter column gap_x_percent set default 30,
  alter column gap_y_percent set default 30,
  add constraint background_settings_gap_x_range check (gap_x_percent between 0 and 100),
  add constraint background_settings_gap_y_range check (gap_y_percent between 0 and 100),
  drop constraint background_settings_gap_range,
  drop column gap_percent;
