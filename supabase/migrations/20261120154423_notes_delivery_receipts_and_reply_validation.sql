create or replace function private.validate_note_reply_target()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_target_owner uuid; v_target_kind text;
begin
  if new.reply_to_id is null then return new; end if;
  if auth.uid() is null or new.owner_id is distinct from auth.uid() then
    raise exception 'A reply must be sent by the signed-in user.';
  end if;
  select m.owner_id, m.kind into v_target_owner, v_target_kind
  from public.memories m where m.id = new.reply_to_id;
  if not found or v_target_kind <> 'note' then
    raise exception 'The message you are replying to is unavailable.';
  end if;
  if v_target_owner <> auth.uid() and not exists (
    select 1 from public.follows f where f.follower_id = auth.uid() and f.followed_id = v_target_owner
  ) then raise exception 'You cannot reply to a message outside your conversation.'; end if;
  return new;
end;
$$;
revoke all on function private.validate_note_reply_target() from public, anon, authenticated;
drop trigger if exists validate_note_reply_target on public.memories;
create trigger validate_note_reply_target before insert or update of reply_to_id on public.memories
for each row execute function private.validate_note_reply_target();

create table if not exists public.note_delivery_receipts (
  message_id bigint not null references public.memories(id) on delete cascade,
  reader_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  primary key (message_id, reader_id)
);
create index if not exists note_delivery_receipts_owner_message_idx on public.note_delivery_receipts(owner_id, message_id);
alter table public.note_delivery_receipts enable row level security;
drop policy if exists "Message owners can read delivery receipts" on public.note_delivery_receipts;
create policy "Message owners can read delivery receipts" on public.note_delivery_receipts
for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "Readers can acknowledge delivered notes" on public.note_delivery_receipts;
create policy "Readers can acknowledge delivered notes" on public.note_delivery_receipts
for insert to authenticated with check (
  reader_id = (select auth.uid()) and reader_id <> owner_id
  and exists (
    select 1 from public.memories m
    join public.follows f on f.follower_id = (select auth.uid()) and f.followed_id = m.owner_id
    where m.id = note_delivery_receipts.message_id and m.owner_id = note_delivery_receipts.owner_id and m.kind = 'note'
  )
);
grant select, insert on public.note_delivery_receipts to authenticated;

create or replace function public.mark_notes_delivered(p_message_ids bigint[])
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in to acknowledge delivered messages.'; end if;
  insert into public.note_delivery_receipts(message_id, reader_id, owner_id)
  select m.id, auth.uid(), m.owner_id
  from public.memories m
  join public.follows f on f.follower_id = auth.uid() and f.followed_id = m.owner_id
  where m.id = any(coalesce(p_message_ids, array[]::bigint[]))
    and m.kind = 'note' and m.owner_id <> auth.uid()
  on conflict (message_id, reader_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.mark_notes_delivered(bigint[]) from public, anon;
grant execute on function public.mark_notes_delivered(bigint[]) to authenticated;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='note_delivery_receipts') then
    alter publication supabase_realtime add table public.note_delivery_receipts;
  end if;
end $$;