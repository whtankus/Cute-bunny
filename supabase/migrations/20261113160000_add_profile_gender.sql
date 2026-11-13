alter table public.profiles
  add column if not exists gender text
  check (gender in ('male', 'female'));

grant update (gender) on public.profiles to authenticated;
