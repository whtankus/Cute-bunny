-- Store Petal Points in the account's cloud garden collection so balances
-- are consistent across devices and visible on friend profiles.
alter table public.profile_garden_collections
  add column if not exists petal_points bigint not null default 0
  check (petal_points >= 0);

-- Seed the requested preview balance for @meow.
update public.profile_garden_collections c
set petal_points = 100000,
    updated_at = now()
from public.profiles p
where p.id = c.user_id
  and lower(p.username) = 'meow';
