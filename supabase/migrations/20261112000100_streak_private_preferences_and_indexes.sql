-- Cute Bunny: persistent login streaks, private preferences, and query indexes.
-- Additive only: existing profile, follow, memory, and notification rows are preserved.

alter table public.profiles
  add column if not exists login_streak integer not null default 0,
  add column if not exists last_login_date date;

create table if not exists public.profile_private_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notification_preferences jsonb not null
    default '{"memories":true,"buddy":true}'::jsonb
    check (jsonb_typeof(notification_preferences) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.profile_private_settings enable row level security;
drop policy if exists "Users read own private settings" on public.profile_private_settings;
create policy "Users read own private settings" on public.profile_private_settings
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users insert own private settings" on public.profile_private_settings;
create policy "Users insert own private settings" on public.profile_private_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users update own private settings" on public.profile_private_settings;
create policy "Users update own private settings" on public.profile_private_settings
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on table public.profile_private_settings from public, anon;
grant select, insert, update on table public.profile_private_settings to authenticated;

insert into public.profile_private_settings (user_id, notification_preferences)
select p.id, coalesce(p.notification_preferences, '{"memories":true,"buddy":true}'::jsonb)
from public.profiles p
on conflict (user_id) do nothing;

create or replace function public.ensure_profile_private_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profile_private_settings (user_id, notification_preferences)
  values (new.id, coalesce(new.notification_preferences, '{"memories":true,"buddy":true}'::jsonb))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_create_private_settings on public.profiles;
create trigger profiles_create_private_settings after insert on public.profiles
for each row execute function public.ensure_profile_private_settings();

-- Keep old clients compatible while current clients move preferences into the private table.
create or replace function public.sync_profile_private_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.notification_preferences is distinct from old.notification_preferences then
    insert into public.profile_private_settings (user_id, notification_preferences, updated_at)
    values (new.id, coalesce(new.notification_preferences, '{"memories":true,"buddy":true}'::jsonb), now())
    on conflict (user_id) do update
      set notification_preferences = excluded.notification_preferences,
          updated_at = excluded.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_private_settings on public.profiles;
create trigger profiles_sync_private_settings after update of notification_preferences on public.profiles
for each row execute function public.sync_profile_private_settings();

create or replace function public.notify_followers_of_memory()
returns trigger language plpgsql security definer set search_path = '' as $$
declare activity text;
begin
  activity := case new.kind
    when 'photo' then ' shared a new photo with you.'
    when 'song' then ' added a new song to your music garden.'
    else ' left you a little message.'
  end;
  insert into public.notifications (recipient_id, actor_id, kind, memory_id, message)
  select f.follower_id, new.owner_id, new.kind, new.id,
         coalesce(p.display_name, p.username, 'Your friend') || activity
  from public.follows f
  join public.profiles p on p.id = new.owner_id
  where f.followed_id = new.owner_id
    and f.follower_id <> new.owner_id
    and coalesce((select s.notification_preferences ->> 'memories'
                  from public.profile_private_settings s where s.user_id = f.follower_id), 'true') <> 'false';
  return new;
end;
$$;

create or replace function public.send_buddy_ping()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  actor_name text;
  lines text[] := array[
    'is here! Come say hello ♡', 'wants your attention ♡',
    'says come here! ♡', 'is active in your little garden ♡'
  ];
  line text;
begin
  if actor is null then raise exception 'Please sign in again.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text, 29));
  if exists (select 1 from public.notifications n
             where n.actor_id = actor and n.kind = 'buddy'
               and n.created_at > now() - interval '60 seconds') then
    return false;
  end if;
  if coalesce((select s.notification_preferences ->> 'buddy'
               from public.profile_private_settings s where s.user_id = actor), 'true') = 'false' then
    return false;
  end if;
  select coalesce(p.display_name, p.username, 'Your friend') into actor_name
  from public.profiles p where p.id = actor;
  line := lines[1 + floor(random() * array_length(lines, 1))::int];
  insert into public.notifications (recipient_id, actor_id, kind, message)
  select theirs.follower_id, actor, 'buddy', actor_name || ' ' || line
  from public.follows mine
  join public.follows theirs on theirs.followed_id = actor and theirs.follower_id = mine.followed_id
  join public.profiles recipient on recipient.id = theirs.follower_id
  where mine.follower_id = actor and theirs.follower_id <> actor
    and coalesce((select s.notification_preferences ->> 'buddy'
                  from public.profile_private_settings s where s.user_id = recipient.id), 'true') <> 'false';
  return found;
end;
$$;

create index if not exists follows_followed_id_idx on public.follows (followed_id);
create index if not exists notifications_actor_id_idx on public.notifications (actor_id);
create index if not exists notifications_memory_id_idx on public.notifications (memory_id);

create or replace function public.record_login_streak()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := auth.uid();
  streak_count integer;
  streak_date date;
begin
  if current_user_id is null then raise exception 'Sign in is required.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 29));
  update public.profiles
  set login_streak = case
      when last_login_date = current_date then greatest(login_streak, 1)
      when last_login_date = current_date - 1 then login_streak + 1
      else 1
    end,
    last_login_date = current_date
  where id = current_user_id
  returning login_streak, last_login_date into streak_count, streak_date;
  if not found then raise exception 'Profile not found.'; end if;
  return pg_catalog.jsonb_build_object('login_streak', streak_count, 'last_login_date', streak_date);
end;
$$;
