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
