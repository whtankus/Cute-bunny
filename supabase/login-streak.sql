-- Run once in Supabase SQL Editor to sync the daily login streak across devices.
alter table public.profiles
  add column if not exists login_streak integer not null default 0,
  add column if not exists last_login_date date;

create or replace function public.record_login_streak()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  streak_count integer;
  streak_date date;
begin
  if current_user_id is null then
    raise exception 'Sign in is required.';
  end if;

  update public.profiles
  set login_streak = case
        when last_login_date = current_date then login_streak
        when last_login_date = current_date - 1 then login_streak + 1
        else 1
      end,
      last_login_date = current_date
  where id = current_user_id
  returning login_streak, last_login_date into streak_count, streak_date;

  if not found then
    raise exception 'Profile not found.';
  end if;

  return pg_catalog.jsonb_build_object(
    'login_streak', streak_count,
    'last_login_date', streak_date
  );
end;
$$;

revoke all on function public.record_login_streak() from public;
grant execute on function public.record_login_streak() to authenticated;

