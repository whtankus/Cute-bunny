-- Store each profile's IANA timezone so streak days use that person's local calendar.
alter table public.profiles
  add column if not exists streak_timezone text not null default 'UTC';

-- This timezone is public profile metadata required to interpret last_login_date.
grant select (streak_timezone) on table public.profiles to authenticated;

-- Authoritative daily streak update using the account's local calendar date.
create or replace function public.record_login_streak_for_timezone(p_timezone text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  timezone_name text := nullif(btrim(p_timezone), '');
  local_today date;
  streak_count integer;
  streak_date date;
begin
  if current_user_id is null then
    raise exception 'Sign in is required.';
  end if;

  if timezone_name is null or not exists (
    select 1
    from pg_catalog.pg_timezone_names as zone
    where zone.name = timezone_name
  ) then
    raise exception 'A valid IANA timezone is required.';
  end if;

  local_today := (pg_catalog.now() at time zone timezone_name)::date;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 29)
  );

  update public.profiles
  set
    streak_timezone = timezone_name,
    login_streak = case
      when last_login_date = local_today then greatest(login_streak, 1)
      when last_login_date = local_today - 1 then login_streak + 1
      else 1
    end,
    last_login_date = local_today
  where id = current_user_id
  returning login_streak, last_login_date
    into streak_count, streak_date;

  if not found then
    raise exception 'Profile not found.';
  end if;

  return pg_catalog.jsonb_build_object(
    'login_streak', streak_count,
    'last_login_date', streak_date,
    'streak_timezone', timezone_name
  );
end;
$$;

revoke all on function public.record_login_streak_for_timezone(text) from public, anon, authenticated;
grant execute on function public.record_login_streak_for_timezone(text) to authenticated;
