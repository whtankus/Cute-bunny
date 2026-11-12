-- Accept legacy browser streak dates one day ahead of a member's local date.
-- Older clients persisted dates using UTC, which can be tomorrow in western timezones.
create or replace function public.record_login_streak_for_timezone(
  p_timezone text,
  p_legacy_count integer,
  p_legacy_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  timezone_name text := nullif(btrim(p_timezone), '');
  local_today date;
  legacy_count integer := greatest(0, least(coalesce(p_legacy_count, 0), 3650));
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
      when last_login_date is null
        and p_legacy_date between local_today - 1 and local_today + 1
        then case
          when p_legacy_date = local_today - 1
            then greatest(login_streak, legacy_count, 1) + 1
          else greatest(login_streak, legacy_count, 1)
        end
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

revoke all on function public.record_login_streak_for_timezone(text, integer, date) from public, anon, authenticated;
grant execute on function public.record_login_streak_for_timezone(text, integer, date) to authenticated;
