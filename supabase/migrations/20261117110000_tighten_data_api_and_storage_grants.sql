-- Tighten Data API grants to match the application's RLS access model.
-- RLS remains the row-level boundary; these grants remove unnecessary table-wide capabilities.

revoke all privileges on table
  public.profiles,
  public.follows,
  public.memories,
  public.memory_likes,
  public.note_read_cursors,
  public.notifications,
  public.profile_private_settings
from anon, authenticated;

-- Profiles: expose only fields used by the social UI and only allow intended edits.
grant select (
  id, username, display_name, bio, theme, mascot, profile_wallpaper, gender,
  created_at, login_streak, last_login_date, streak_timezone, last_active_at
) on table public.profiles to authenticated;
grant update (
  username, display_name, bio, theme, mascot, gender, profile_wallpaper, last_active_at
) on table public.profiles to authenticated;

-- Follow graph.
grant select, insert, delete on table public.follows to authenticated;

-- Memories are immutable after creation through the client; ownership is enforced by RLS.
grant select, insert, delete on table public.memories to authenticated;
grant usage, select on sequence public.memories_id_seq to authenticated;

-- Reactions can be read, added, or removed; no client-side updates.
grant select, insert, delete on table public.memory_likes to authenticated;

-- Read receipts are accessed directly and through the validated mark_notes_seen RPC.
grant select, insert, update on table public.note_read_cursors to authenticated;

-- Notifications can be read, marked read, and dismissed by their recipient.
grant select, delete on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

-- Private preferences support the app's per-user upsert flow.
grant select, insert, update on table public.profile_private_settings to authenticated;

-- storage.objects is owned and ACL-managed by Supabase's storage administrator.
-- Its existing RLS policies remain the authorization boundary for private media.

-- Cover the referenced memory id during parent deletes and FK checks.
create index if not exists note_read_cursors_last_read_message_id_idx
  on public.note_read_cursors (last_read_message_id);

-- The timezone-aware streak RPC is the active client entry point. Disable the
-- unused legacy RPC so it is not exposed as an unnecessary SECURITY DEFINER endpoint.
revoke all on function public.record_login_streak() from public, anon, authenticated;
