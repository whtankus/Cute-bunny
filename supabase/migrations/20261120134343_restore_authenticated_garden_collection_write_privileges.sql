grant select, insert, update on public.profile_garden_collections to authenticated;
grant usage on schema public to authenticated;

-- Keep row ownership enforced by the existing RLS policies.
-- Upserts require UPDATE as well as INSERT on the user's collection row.
