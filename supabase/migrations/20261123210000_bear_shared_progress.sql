-- Shared Bear Hugs affection progress.
-- One progress row belongs to the accepted Bearfriend pair, not either browser.
create table if not exists public.bear_partner_progress (
  id uuid primary key default gen_random_uuid(),
  partner_low uuid not null references public.profiles(id) on delete cascade,
  partner_high uuid not null references public.profiles(id) on delete cascade,
  love_points bigint not null default 0 check (love_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bear_partner_progress_ordered_pair check (partner_low < partner_high),
  constraint bear_partner_progress_unique_pair unique (partner_low, partner_high)
);

alter table public.bear_partner_progress enable row level security;
drop policy if exists "Bearfriends read shared progress" on public.bear_partner_progress;
create policy "Bearfriends read shared progress" on public.bear_partner_progress
  for select to authenticated
  using (auth.uid() = partner_low or auth.uid() = partner_high);

revoke all on public.bear_partner_progress from anon, authenticated;
grant select on public.bear_partner_progress to authenticated;

-- Clients cannot directly set points. The function verifies the accepted
-- Bearfriend relationship and atomically awards two points per delivered action.
create or replace function public.record_bear_hug_action(p_partner_id uuid)
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

  if not exists (
    select 1
    from public.bear_partner_requests r
    where r.status = 'accepted'
      and (
        (r.sender_id = v_user_id and r.recipient_id = p_partner_id)
        or
        (r.sender_id = p_partner_id and r.recipient_id = v_user_id)
      )
  ) then
    raise exception 'An accepted Bearfriend relationship is required';
  end if;

  if v_user_id < p_partner_id then
    v_low := v_user_id;
    v_high := p_partner_id;
  else
    v_low := p_partner_id;
    v_high := v_user_id;
  end if;

  insert into public.bear_partner_progress (partner_low, partner_high, love_points)
  values (v_low, v_high, 2)
  on conflict (partner_low, partner_high)
  do update set
    love_points = public.bear_partner_progress.love_points + 2,
    updated_at = now()
  returning love_points into v_points;

  return v_points;
end;
$$;

revoke all on function public.record_bear_hug_action(uuid) from public, anon;
grant execute on function public.record_bear_hug_action(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bear_partner_progress'
  ) then
    alter publication supabase_realtime add table public.bear_partner_progress;
  end if;
end
$$;
