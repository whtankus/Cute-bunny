-- Add tummy scratching to the shared Bear Hugs action allow-list.
create or replace function public.record_bear_hug_action(
  p_partner_id uuid,
  p_action text
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
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_partner_id is null or p_partner_id = v_user_id then
    raise exception 'Invalid Bearfriend';
  end if;
  if p_action is null or p_action not in ('hug', 'kiss', 'hands', 'dance', 'pet', 'feed', 'sleep', 'tummy', 'idle') then
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
  insert into public.bear_partner_progress (partner_low, partner_high, love_points, last_action)
  values (v_low, v_high, 2, p_action)
  on conflict (partner_low, partner_high)
  do update set
    love_points = public.bear_partner_progress.love_points + 2,
    last_action = excluded.last_action,
    updated_at = now()
  where public.bear_partner_progress.last_action is distinct from excluded.last_action
  returning love_points into v_points;
  if not found then
    raise exception 'Choose a different action before repeating this one';
  end if;
  return v_points;
end;
$$;
revoke all on function public.record_bear_hug_action(uuid, text) from public, anon;
grant execute on function public.record_bear_hug_action(uuid, text) to authenticated;
