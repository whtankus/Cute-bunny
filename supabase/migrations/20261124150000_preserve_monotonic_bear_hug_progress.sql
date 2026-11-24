-- Preserve the shared Bear Hugs counter as a monotonic lifetime total.
-- A stale/retried browser call must never write an older client-side total over newer progress.
create or replace function public.record_bear_hug_action(
  p_partner_id uuid,
  p_action text,
  p_action_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_points bigint;
  v_existing public.bear_hug_action_receipts%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_partner_id is null or p_partner_id = v_user_id or p_action_id is null then
    raise exception 'Invalid Bearfriend action';
  end if;
  if p_action is null or p_action not in (
    'hug', 'kiss', 'flykiss', 'slap', 'hands', 'dance', 'pet',
    'feed', 'sleep', 'tummy', 'idle'
  ) then
    raise exception 'Invalid Bear Hugs action';
  end if;
  if not exists (
    select 1 from public.bear_partner_requests r
    where r.status = 'accepted'
      and ((r.sender_id = v_user_id and r.recipient_id = p_partner_id)
        or (r.sender_id = p_partner_id and r.recipient_id = v_user_id))
  ) then
    raise exception 'An accepted Bearfriend relationship is required';
  end if;

  if v_user_id < p_partner_id then
    v_low := v_user_id; v_high := p_partner_id;
  else
    v_low := p_partner_id; v_high := v_user_id;
  end if;

  insert into public.bear_hug_action_receipts
    (sender_id, action_id, partner_low, partner_high, action)
  values (v_user_id, p_action_id, v_low, v_high, p_action)
  on conflict (sender_id, action_id) do nothing;

  if not found then
    select * into v_existing
    from public.bear_hug_action_receipts
    where sender_id = v_user_id and action_id = p_action_id;
    if v_existing.partner_low <> v_low
       or v_existing.partner_high <> v_high
       or v_existing.action <> p_action then
      raise exception 'Action ID was already used for a different action';
    end if;
    select love_points into v_points
    from public.bear_partner_progress
    where partner_low = v_low and partner_high = v_high;
    return coalesce(v_points, v_existing.points_after);
  end if;

  insert into public.bear_partner_progress
    (partner_low, partner_high, love_points, last_action)
  values (v_low, v_high, 2, p_action)
  on conflict (partner_low, partner_high)
  do update set
    love_points = greatest(public.bear_partner_progress.love_points, 0) + 2,
    last_action = excluded.last_action,
    updated_at = now()
  returning love_points into v_points;

  update public.bear_hug_action_receipts
  set points_after = v_points
  where sender_id = v_user_id and action_id = p_action_id;

  return v_points;
end;
$$;

revoke all on function public.record_bear_hug_action(uuid, text, uuid) from public, anon;
grant execute on function public.record_bear_hug_action(uuid, text, uuid) to authenticated;
