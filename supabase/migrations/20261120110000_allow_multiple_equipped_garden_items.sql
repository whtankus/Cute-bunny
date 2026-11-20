alter table public.profile_garden_collections
  add column if not exists equipped_items text[] not null default '{}'::text[];

update public.profile_garden_collections
set equipped_items = array_remove(array[
  nullif(equipped, 'none'),
  nullif(bunny, 'none')
], null)
where coalesce(array_length(equipped_items, 1), 0) = 0
  and (equipped <> 'none' or bunny <> 'none');
