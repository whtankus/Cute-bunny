-- Persist Bear Hugs reward equipment on the shared partner progress row.
alter table public.bear_partner_progress
  add column if not exists equipped_reward_ids text[] not null default '{}';

create or replace function public.set_bear_hug_equipment(
  p_partner_id uuid,
  p_reward_ids text[]
)
returns text[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_points bigint;
  v_ids text[] := coalesce(p_reward_ids, '{}');
  v_id text;
  v_slot text;
  v_seen_slots text[] := '{}';
  v_required_points bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_partner_id is null or p_partner_id = v_user_id then
    raise exception 'Invalid Bearfriend';
  end if;
  if not exists (
    select 1 from public.bear_partner_requests r
    where r.status = 'accepted'
      and ((r.sender_id = v_user_id and r.recipient_id = p_partner_id)
        or (r.sender_id = p_partner_id and r.recipient_id = v_user_id))
  ) then
    raise exception 'An accepted Bearfriend relationship is required';
  end if;
  if cardinality(v_ids) > 3 then
    raise exception 'Too many equipped rewards';
  end if;

  if v_user_id < p_partner_id then
    v_low := v_user_id; v_high := p_partner_id;
  else
    v_low := p_partner_id; v_high := v_user_id;
  end if;

  select love_points into v_points
  from public.bear_partner_progress
  where partner_low = v_low and partner_high = v_high
  for update;

  v_points := coalesce(v_points, 0);

  foreach v_id in array v_ids loop
    v_slot := case v_id
      when 'sunset-meadow' then 'background'
      when 'strawberry-hat' then 'headwear'
      when 'honey-bear' then 'skin'
      when 'starry-set' then 'background'
      when 'starlight-crowns' then 'headwear'
      else null
    end;
    if v_slot is null then
      raise exception 'Unknown Bear Hugs reward';
    end if;
    if v_slot = any(v_seen_slots) then
      raise exception 'Only one reward per slot can be equipped';
    end if;
    v_seen_slots := array_append(v_seen_slots, v_slot);

    v_required_points := case v_id
      when 'sunset-meadow' then 100
      when 'strawberry-hat' then 350
      when 'honey-bear' then 1250
      when 'starry-set' then 2150
      when 'starlight-crowns' then 3050
    end;
    if v_points < v_required_points then
      raise exception 'This Bear Hugs reward is still locked';
    end if;
  end loop;

  insert into public.bear_partner_progress
    (partner_low, partner_high, love_points, equipped_reward_ids)
  values (v_low, v_high, v_points, v_ids)
  on conflict (partner_low, partner_high)
  do update set
    equipped_reward_ids = excluded.equipped_reward_ids,
    updated_at = now();

  return v_ids;
end;
$$;

revoke all on function public.set_bear_hug_equipment(uuid, text[]) from public, anon;
grant execute on function public.set_bear_hug_equipment(uuid, text[]) to authenticated;
