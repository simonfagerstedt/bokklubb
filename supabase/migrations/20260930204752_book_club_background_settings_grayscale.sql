-- Admin-toggleable "grayscale vs color" for the background collage.
alter table public.background_settings
  add column grayscale boolean not null default true;
