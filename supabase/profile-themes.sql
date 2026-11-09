-- Add the extra profile color themes used by the Cute Bunny website.
-- Safe to run again; no profile rows are changed.
alter table public.profiles
  drop constraint if exists profiles_theme_check;

alter table public.profiles
  add constraint profiles_theme_check
  check (theme in ('rose', 'lavender', 'mint', 'sky', 'peach', 'berry', 'midnight'));

