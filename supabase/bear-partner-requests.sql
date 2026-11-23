-- Bear Partner invitations for the Bear Hugs mini-game.
create table if not exists public.bear_partner_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> recipient_id)
);
create unique index if not exists bear_partner_requests_one_pending_pair
  on public.bear_partner_requests (sender_id, recipient_id) where status = 'pending';
create index if not exists bear_partner_requests_recipient_status
  on public.bear_partner_requests (recipient_id, status, created_at desc);
alter table public.bear_partner_requests enable row level security;
drop policy if exists "Read own Bear Partner requests" on public.bear_partner_requests;
create policy "Read own Bear Partner requests" on public.bear_partner_requests
  for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
drop policy if exists "Send Bear Partner requests as yourself" on public.bear_partner_requests;
create policy "Send Bear Partner requests as yourself" on public.bear_partner_requests
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and recipient_id <> (select auth.uid()) and status = 'pending');
drop policy if exists "Recipient responds to Bear Partner requests" on public.bear_partner_requests;
create policy "Recipient responds to Bear Partner requests" on public.bear_partner_requests
  for update to authenticated
  using (recipient_id = (select auth.uid()) and status = 'pending')
  with check (recipient_id = (select auth.uid()) and status in ('accepted','rejected'));
grant select, insert on public.bear_partner_requests to authenticated;
grant update (status, responded_at) on public.bear_partner_requests to authenticated;

-- Prevent opposite-direction pending invitations for the same pair.
create unique index if not exists bear_partner_requests_one_pending_pair
  on public.bear_partner_requests (least(sender_id, recipient_id), greatest(sender_id, recipient_id))
  where status = 'pending';

-- Allow the sender to withdraw only their own pending invitation.
drop policy if exists "Sender cancels own pending Bearfriend request" on public.bear_partner_requests;
create policy "Sender cancels own pending Bearfriend request" on public.bear_partner_requests
  for delete to authenticated
  using (sender_id = (select auth.uid()) and status = 'pending');
grant delete on public.bear_partner_requests to authenticated;

-- Enable Realtime for request notifications if the table is not already published.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bear_partner_requests'
  ) then
    alter publication supabase_realtime add table public.bear_partner_requests;
  end if;
end
$$;
