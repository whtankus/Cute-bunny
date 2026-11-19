-- Allow a Notes typing sender to subscribe to their own private topic.
-- Followers may also subscribe to the topic of an account they follow.
-- Without the owner branch, Supabase rejects the sender's private channel
-- before it can publish any Broadcast events.

drop policy if exists "followers can receive notes typing broadcasts" on realtime.messages;

create policy "owners and followers can receive notes typing broadcasts"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and topic like 'cute-bunny-notes-typing:%'
  and (
    split_part(topic, ':', 2) = (select auth.uid())::text
    or exists (
      select 1
      from public.follows as f
      where f.follower_id = (select auth.uid())
        and f.followed_id::text = split_part(realtime.messages.topic, ':', 2)
    )
  )
);
