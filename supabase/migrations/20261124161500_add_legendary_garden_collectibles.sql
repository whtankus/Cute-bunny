create or replace function public.perform_garden_shop_action(p_item_id text, p_action text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_cost bigint;
  v_type text;
  v_owned text[];
  v_equipped_items text[];
  v_petals bigint;
  v_equipped text;
  v_bunny text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to use the garden shop.';
  end if;
  if p_action not in ('purchase', 'toggle_equip') then
    raise exception 'Unsupported garden shop action.';
  end if;

  select catalog.cost, catalog.item_type into v_cost, v_type
  from (values
    ('pink-tulips', 30::bigint, 'garden'), ('moon-lantern', 45::bigint, 'garden'),
    ('tiny-mushroom', 60::bigint, 'garden'), ('golden-bell', 80::bigint, 'garden'),
    ('bunny-bow', 35::bigint, 'bunny'), ('flower-crown', 65::bigint, 'bunny'),
    ('starry-hat', 90::bigint, 'bunny'), ('crystal-dew', 120::bigint, 'garden'),
    ('aurora-fountain', 180::bigint, 'garden'), ('moon-bunny-hood', 220::bigint, 'bunny'),
    ('celestial-rose', 350::bigint, 'garden'), ('divine-lotus', 350::bigint, 'garden'),
    ('dreamwing-halo', 400::bigint, 'bunny'),
    ('moonlit-orchid', 400::bigint, 'garden'),
    ('crystal-butterfly', 400::bigint, 'garden'),
    ('sunfire-blossom', 400::bigint, 'garden')
  ) as catalog(item_id, cost, item_type)
  where catalog.item_id = p_item_id;

  if not found then
    raise exception 'This collectible is not available in the shop.';
  end if;

  insert into public.profile_garden_collections (user_id)
  values (v_user_id) on conflict (user_id) do nothing;

  select collection.owned, collection.equipped_items, collection.petal_points
    into v_owned, v_equipped_items, v_petals
  from public.profile_garden_collections as collection
  where collection.user_id = v_user_id
  for update;

  v_owned := coalesce(v_owned, array[]::text[]);
  v_equipped_items := coalesce(v_equipped_items, array[]::text[]);
  v_petals := greatest(0, coalesce(v_petals, 0));

  if p_action = 'purchase' then
    if p_item_id = any(v_owned) then
      return jsonb_build_object('ok', true, 'status', 'already_owned',
        'owned', to_jsonb(v_owned), 'equipped_items', to_jsonb(v_equipped_items),
        'petal_points', v_petals);
    end if;
    if v_petals < v_cost then
      raise exception 'Not enough Petal Points. You need % more.', (v_cost - v_petals);
    end if;
    v_owned := array_append(v_owned, p_item_id);
    if not (p_item_id = any(v_equipped_items)) then
      v_equipped_items := array_append(v_equipped_items, p_item_id);
    end if;
    v_petals := v_petals - v_cost;
  else
    if not (p_item_id = any(v_owned)) then
      raise exception 'Collect this item before equipping it.';
    end if;
    if p_item_id = any(v_equipped_items) then
      v_equipped_items := array_remove(v_equipped_items, p_item_id);
    else
      v_equipped_items := array_append(v_equipped_items, p_item_id);
    end if;
  end if;

  select equipped_item.item_id into v_equipped
  from unnest(v_equipped_items) as equipped_item(item_id)
  where equipped_item.item_id in (
    'pink-tulips','moon-lantern','tiny-mushroom','golden-bell','crystal-dew',
    'aurora-fountain','celestial-rose','divine-lotus',
    'moonlit-orchid','crystal-butterfly','sunfire-blossom'
  )
  limit 1;

  select equipped_item.item_id into v_bunny
  from unnest(v_equipped_items) as equipped_item(item_id)
  where equipped_item.item_id in ('bunny-bow','flower-crown','starry-hat','moon-bunny-hood','dreamwing-halo')
  limit 1;

  update public.profile_garden_collections
  set owned = v_owned, equipped_items = v_equipped_items,
      equipped = coalesce(v_equipped, 'none'), bunny = coalesce(v_bunny, 'none'),
      petal_points = v_petals, updated_at = pg_catalog.now()
  where user_id = v_user_id;

  return jsonb_build_object('ok', true,
    'status', case when p_action = 'purchase' then 'purchased' else 'equipment_updated' end,
    'owned', to_jsonb(v_owned), 'equipped_items', to_jsonb(v_equipped_items),
    'petal_points', v_petals, 'equipped', coalesce(v_equipped, 'none'),
    'bunny', coalesce(v_bunny, 'none'));
end;
$function$;
revoke all on function public.perform_garden_shop_action(text, text) from public, anon;
grant execute on function public.perform_garden_shop_action(text, text) to authenticated;
