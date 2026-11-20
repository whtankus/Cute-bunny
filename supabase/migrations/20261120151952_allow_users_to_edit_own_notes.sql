-- Allow signed-in users to edit only their own note messages.
-- Column-level UPDATE keeps other memory fields protected.
grant update (text) on table public.memories to authenticated;

create policy "Update own notes"
on public.memories
for update
to authenticated
using (
  owner_id = (select auth.uid())
  and kind = 'note'
)
with check (
  owner_id = (select auth.uid())
  and kind = 'note'
);
