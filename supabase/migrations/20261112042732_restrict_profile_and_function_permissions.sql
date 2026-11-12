-- Restrict profile data to fields required by the social UI.
-- Notification preferences live in profile_private_settings.
revoke all on table public.profiles from anon, authenticated;

grant select (id, username, display_name, bio, theme, mascot, created_at, login_streak, last_login_date)
  on table public.profiles to authenticated;
grant update (username, display_name, bio, theme, mascot)
  on table public.profiles to authenticated;

-- Profile discovery remains available to signed-in users through public profile fields.
drop policy if exists "Profiles visible to signed-in friends" on public.profiles;
drop policy if exists "Profiles discoverable by signed-in users" on public.profiles;
create policy "Profiles discoverable by signed-in users" on public.profiles
  for select to authenticated using (true);

-- Trigger-only security-definer functions are not callable through the Data API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.ensure_profile_private_settings() from public, anon, authenticated;
revoke all on function public.sync_profile_private_settings() from public, anon, authenticated;
revoke all on function public.notify_followers_of_memory() from public, anon, authenticated;

-- User-invoked RPCs are available only to authenticated users.
revoke all on function public.send_buddy_ping() from public, anon, authenticated;
grant execute on function public.send_buddy_ping() to authenticated;
revoke all on function public.record_login_streak() from public, anon, authenticated;
grant execute on function public.record_login_streak() to authenticated;
