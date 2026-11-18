-- Add the friend-visible garden collection used by Cute Bunny's Streak Garden.
-- Petal Points and daily quest progress remain local to each signed-in device.
create table if not exists public.profile_garden_collections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  owned text[] not null default '{}'::text[],
  equipped text not null default 'none',
  bunny text not null default 'none',
  updated_at timestamptz not null default now()
);

alter table public.profile_garden_collections enable row level security;

drop policy if exists "Read profile garden collections" on public.profile_garden_collections;
create policy "Read profile garden collections"
  on public.profile_garden_collections
  for select to authenticated
  using (true);

drop policy if exists "Insert own profile garden collection" on public.profile_garden_collections;
create policy "Insert own profile garden collection"
  on public.profile_garden_collections
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Update own profile garden collection" on public.profile_garden_collections;
create policy "Update own profile garden collection"
  on public.profile_garden_collections
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.profile_garden_collections from anon, public;
grant select, insert, update on table public.profile_garden_collections to authenticated;
