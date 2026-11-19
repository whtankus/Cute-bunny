-- Restrict ephemeral Notes typing broadcasts to the user and their followers.
-- Each sender publishes on cute-bunny-notes-typing:<sender UUID>.
-- A follower may read that sender's topic; only the sender may publish to it.

drop policy if exists "followers can receive notes typing broadcasts" on realtime.messages;
drop policy if exists "users can send their own notes typing broadcasts" on realtime.messages;

create policy "followers can receive notes typing broadcasts"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and topic like 'cute-bunny-notes-typing:%'
  and exists (
    select 1
    from public.follows as f
    where f.follower_id = (select auth.uid())
      and f.followed_id::text = split_part(realtime.messages.topic, ':', 2)
  )
);

create policy "users can send their own notes typing broadcasts"
on realtime.messages
for insert
to authenticated
with check (
  extension = 'broadcast'
  and topic = 'cute-bunny-notes-typing:' || (select auth.uid())::text
);
