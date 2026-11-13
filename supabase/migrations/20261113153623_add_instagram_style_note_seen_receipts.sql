create table if not exists public.note_read_cursors (
  reader_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  last_read_message_id bigint not null references public.memories(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (reader_id, owner_id),
  constraint note_read_cursors_no_self_read check (reader_id <> owner_id)
);

create index if not exists note_read_cursors_owner_cursor_idx
  on public.note_read_cursors (owner_id, last_read_message_id desc);

alter table public.note_read_cursors enable row level security;

drop policy if exists "Read own note cursors and viewers of own notes" on public.note_read_cursors;
create policy "Read own note cursors and viewers of own notes"
  on public.note_read_cursors for select to authenticated
  using (reader_id = (select auth.uid()) or owner_id = (select auth.uid()));

drop policy if exists "Create own note read cursor" on public.note_read_cursors;
create policy "Create own note read cursor"
  on public.note_read_cursors for insert to authenticated
  with check (
    reader_id = (select auth.uid())
    and exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid())
        and f.followed_id = note_read_cursors.owner_id
    )
    and exists (
      select 1 from public.memories m
      where m.id = note_read_cursors.last_read_message_id
        and m.owner_id = note_read_cursors.owner_id
        and m.kind = 'note'
    )
  );

drop policy if exists "Advance own note read cursor" on public.note_read_cursors;
create policy "Advance own note read cursor"
  on public.note_read_cursors for update to authenticated
  using (reader_id = (select auth.uid()))
  with check (
    reader_id = (select auth.uid())
    and exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid())
        and f.followed_id = note_read_cursors.owner_id
    )
    and exists (
      select 1 from public.memories m
      where m.id = note_read_cursors.last_read_message_id
        and m.owner_id = note_read_cursors.owner_id
        and m.kind = 'note'
    )
  );

grant select, insert, update on public.note_read_cursors to authenticated;

create or replace function public.mark_notes_seen(
  p_owner_id uuid,
  p_last_read_message_id bigint
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or p_owner_id is null or p_last_read_message_id is null then
    raise exception 'A signed-in reader, note author, and message are required.';
  end if;

  if p_owner_id = auth.uid() then
    raise exception 'You cannot mark your own notes as seen.';
  end if;

  if not exists (
    select 1 from public.follows f
    where f.follower_id = auth.uid()
      and f.followed_id = p_owner_id
  ) then
    raise exception 'You can only mark notes from followed users as seen.';
  end if;

  if not exists (
    select 1 from public.memories m
    where m.id = p_last_read_message_id
      and m.owner_id = p_owner_id
      and m.kind = 'note'
  ) then
    raise exception 'The read position must reference one of the author notes.';
  end if;

  insert into public.note_read_cursors (
    reader_id, owner_id, last_read_message_id, last_read_at
  )
  values (auth.uid(), p_owner_id, p_last_read_message_id, now())
  on conflict (reader_id, owner_id) do update
    set last_read_message_id = excluded.last_read_message_id,
        last_read_at = now()
    where public.note_read_cursors.last_read_message_id < excluded.last_read_message_id;
end;
$$;

revoke all on function public.mark_notes_seen(uuid, bigint) from public, anon;
grant execute on function public.mark_notes_seen(uuid, bigint) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'note_read_cursors'
  ) then
    alter publication supabase_realtime add table public.note_read_cursors;
  end if;
end $$;
