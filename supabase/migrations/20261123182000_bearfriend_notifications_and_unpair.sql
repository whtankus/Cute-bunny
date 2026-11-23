-- Bearfriend pairing management and request notifications.
-- Either member of an accepted pair may remove the pairing.
drop policy if exists "Either Bearfriend can remove accepted pairing" on public.bear_partner_requests;
create policy "Either Bearfriend can remove accepted pairing"
  on public.bear_partner_requests
  for delete
  to authenticated
  using (
    status = 'accepted'
    and (
      sender_id = (select auth.uid())
      or recipient_id = (select auth.uid())
    )
  );

create or replace function private.notify_bearfriend_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  if auth.uid() is distinct from new.sender_id then
    raise exception 'A user can only send a Bearfriend request as themselves';
  end if;

  select coalesce(p.display_name, p.username, 'A friend')
    into actor_name
    from public.profiles p
   where p.id = new.sender_id;

  insert into public.notifications (recipient_id, actor_id, kind, memory_id, message)
  values (
    new.recipient_id,
    new.sender_id,
    'buddy',
    null,
    left(coalesce(actor_name, 'A friend') || ' sent you a Bearfriend request.', 180)
  );

  return new;
end;
$$;

revoke all on function private.notify_bearfriend_request() from public, anon, authenticated;
drop trigger if exists on_bearfriend_request_created on public.bear_partner_requests;
create trigger on_bearfriend_request_created
  after insert on public.bear_partner_requests
  for each row execute function private.notify_bearfriend_request();
