create table if not exists private.petal_point_transactions (
 user_id uuid not null references auth.users(id) on delete cascade,
 grant_key text not null, amount bigint not null check(amount>0), granted_at timestamptz not null default now(),
 primary key(user_id,grant_key));
revoke all on table private.petal_point_transactions from public,anon,authenticated;
create or replace function public.grant_petal_points(p_grant_key text,p_amount bigint) returns jsonb
language plpgsql security definer set search_path=''
as $f$
declare
 uid uuid:=auth.uid();
 inserted_key text;
 balance bigint;
 tz text;
 local_day date;
 reward_day date;
 expected_amount bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_grant_key is null or length(trim(p_grant_key))=0 or length(p_grant_key)>200 then
  raise exception 'Invalid reward key';
 end if;

 select coalesce(nullif(streak_timezone,''),'UTC') into tz
 from public.profiles where id=uid;
 tz:=coalesce(tz,'UTC');
 local_day:=(now() at time zone tz)::date;

 -- Only allow the exact reward types and values the app issues. This prevents
 -- arbitrary authenticated RPC calls from minting unlimited Petal Points.
 if p_grant_key ~ '^chest:[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
  reward_day:=substring(p_grant_key from '^chest:([0-9]{4}-[0-9]{2}-[0-9]{2})$')::date;
  expected_amount:=25;
 elsif p_grant_key ~ '^quest:[0-9]{4}-[0-9]{2}-[0-9]{2}:day-[0-9]{1,2}-quest-[1-3]$' then
  reward_day:=substring(p_grant_key from '^quest:([0-9]{4}-[0-9]{2}-[0-9]{2}):')::date;
  expected_amount:=10;
 elsif p_grant_key ~ '^weekly:[0-9]{4}-[0-9]{2}-[0-9]{2}:(3|5|7)$' then
  reward_day:=substring(p_grant_key from '^weekly:([0-9]{4}-[0-9]{2}-[0-9]{2}):')::date;
  expected_amount:=case substring(p_grant_key from ':([357])$')
    when '3' then 30 when '5' then 50 when '7' then 100 end;
 else
  raise exception 'Unsupported Petal Points reward type';
 end if;

 if p_amount is distinct from expected_amount then
  raise exception 'Invalid Petal Points reward amount';
 end if;
 if reward_day>local_day or reward_day<local_day-366 then
  raise exception 'Petal Points reward date is outside the claim window';
 end if;

 insert into private.petal_point_transactions(user_id,grant_key,amount)
 values(uid,p_grant_key,p_amount)
 on conflict(user_id,grant_key) do nothing
 returning grant_key into inserted_key;

 insert into public.profile_garden_collections(user_id,petal_points,updated_at)
 values(uid,case when inserted_key is null then 0 else p_amount end,now())
 on conflict(user_id) do update set petal_points=public.profile_garden_collections.petal_points+
 case when inserted_key is null then 0 else p_amount end,updated_at=now();

 select petal_points into balance from public.profile_garden_collections where user_id=uid;
 return jsonb_build_object('granted',inserted_key is not null,'petal_points',coalesce(balance,0));
end;$f$;
revoke all on function public.grant_petal_points(text,bigint) from public,anon;
grant execute on function public.grant_petal_points(text,bigint) to authenticated;

create or replace function private.count_kindness_chat_bubble() returns trigger
language plpgsql security definer set search_path=''
as $f$
declare recipient record; recipient_timezone text; local_message_time timestamp;
begin
 if new.kind<>'note' then return new; end if;
 for recipient in
  select distinct candidate.user_id from (
   select new.owner_id as user_id
   union select f.follower_id from public.follows f where f.followed_id=new.owner_id
  ) candidate
 loop
  select coalesce(nullif(p.streak_timezone,''),'UTC') into recipient_timezone
  from public.profiles p where p.id=recipient.user_id;
  local_message_time:=new.created_at at time zone coalesce(recipient_timezone,'UTC');
  if extract(isodow from local_message_time) in (3,7)
     and local_message_time::time>=time '23:00' and local_message_time::time<time '24:00' then
   insert into private.kindness_event_daily(user_id,event_date,bubble_count)
   values(recipient.user_id,local_message_time::date,1)
   on conflict(user_id,event_date) do update
    set bubble_count=private.kindness_event_daily.bubble_count+1;
  end if;
 end loop;
 return new;
end;$f$;

create or replace function public.get_kindness_event_status() returns jsonb
language plpgsql security definer set search_path=''
as $f$
declare
 uid uuid:=auth.uid(); tz text; local_now timestamp; local_day date; dow integer;
 active_today boolean; next_day date; bubbles integer:=0; credited_total bigint:=0;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select coalesce(nullif(streak_timezone,''),'UTC') into tz from public.profiles where id=uid;
 tz:=coalesce(tz,'UTC'); local_now:=now() at time zone tz; local_day:=local_now::date;
 dow:=extract(isodow from local_now)::integer; active_today:=dow in (3,7) and local_now::time>=time '23:00';

 -- Credit every completed, unclaimed Sunday/Wednesday session. This catches
 -- up users who were offline for multiple event days, without double-crediting.
 with completed_sessions as (
  update private.kindness_event_daily
  set claimed_at=now()
  where user_id=uid
    and event_date<local_day
    and extract(isodow from event_date) in (3,7)
    and bubble_count>0
    and claimed_at is null
  returning bubble_count
 )
 select coalesce(sum(bubble_count),0)::bigint into credited_total
 from completed_sessions;

 if credited_total>0 then
  insert into public.profile_garden_collections(user_id,petal_points,updated_at)
  values(uid,credited_total,now())
  on conflict(user_id) do update
   set petal_points=public.profile_garden_collections.petal_points+excluded.petal_points,
       updated_at=now();
 end if;

 if active_today then
  select coalesce(d.bubble_count,0) into bubbles from private.kindness_event_daily d
  where d.user_id=uid and d.event_date=local_day;
 end if;
 select min(day_value::date) into next_day
 from generate_series(local_day,local_day+7,interval '1 day') day_value
 where extract(isodow from day_value) in (3,7)
 and (day_value::date>local_day or local_now::time<time '23:00');
 return jsonb_build_object('state',case when active_today then 'active' else 'waiting' end,
  'show_poster',active_today,'bubble_count',coalesce(bubbles,0),'timezone',tz,
  'starts_at',((coalesce(next_day,local_day)::timestamp+time '23:00') at time zone tz),
  'days',jsonb_build_array('Sunday','Wednesday'));
end;$f$;
revoke all on function public.get_kindness_event_status() from public,anon;
grant execute on function public.get_kindness_event_status() to authenticated;

create or replace function public.claim_kindness_event_reward() returns jsonb
language plpgsql security definer set search_path=''
as $f$
declare uid uuid:=auth.uid(); tz text; local_now timestamp; event_day date;
 reward integer; was_claimed boolean; balance bigint;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select coalesce(nullif(streak_timezone,''),'UTC') into tz from public.profiles where id=uid;
 tz:=coalesce(tz,'UTC'); local_now:=now() at time zone tz;
 if extract(isodow from local_now) in (3,7) and local_now::time>=time '23:00' then
  raise exception 'Kindness Hour is still running. Petals are credited after midnight.';
 end if;
 select max(day_value::date) into event_day
 from generate_series(local_now::date-7,local_now::date-1,interval '1 day') day_value
 where extract(isodow from day_value) in (3,7);
 select d.bubble_count,d.claimed_at is not null into reward,was_claimed
 from private.kindness_event_daily d where d.user_id=uid and d.event_date=event_day for update;
 if reward is null or reward<=0 then raise exception 'No kindness petals are available to collect.'; end if;
 if was_claimed then raise exception 'This kindness reward has already been collected.'; end if;
 update private.kindness_event_daily set claimed_at=now()
 where user_id=uid and event_date=event_day and claimed_at is null;
 if not found then raise exception 'This kindness reward has already been collected.'; end if;
 insert into public.profile_garden_collections(user_id,petal_points,updated_at) values(uid,reward,now())
 on conflict(user_id) do update set petal_points=public.profile_garden_collections.petal_points+excluded.petal_points,updated_at=now();
 select petal_points into balance from public.profile_garden_collections where user_id=uid;
 return jsonb_build_object('claimed',true,'event_date',event_day,'petal_points',reward,'balance',balance);
end;$f$;
revoke all on function public.claim_kindness_event_reward() from public,anon;
grant execute on function public.claim_kindness_event_reward() to authenticated;