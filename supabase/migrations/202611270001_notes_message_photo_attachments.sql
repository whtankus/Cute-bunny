-- Durable links between Notes messages and Photo Garden memories.
create table if not exists public.note_message_photos (
  note_id bigint not null references public.memories(id) on delete cascade,
  photo_id bigint not null unique references public.memories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, photo_id),
  constraint note_message_photos_distinct check (note_id <> photo_id)
);
alter table public.note_message_photos enable row level security;

drop policy if exists "Read attached photos with visible note" on public.note_message_photos;
create policy "Read attached photos with visible note"
on public.note_message_photos for select to authenticated
using (
  exists (
    select 1 from public.memories n
    where n.id = note_message_photos.note_id and n.kind = 'note'
      and (
        n.owner_id = (select auth.uid())
        or exists (
          select 1 from public.follows f
          where f.follower_id = (select auth.uid()) and f.followed_id = n.owner_id
        )
      )
  )
);

drop policy if exists "Attach own photo to own note" on public.note_message_photos;
create policy "Attach own photo to own note"
on public.note_message_photos for insert to authenticated
with check (
  exists (
    select 1 from public.memories n
    where n.id = note_message_photos.note_id and n.kind = 'note'
      and n.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from public.memories p
    where p.id = note_message_photos.photo_id and p.kind = 'photo'
      and p.owner_id = (select auth.uid())
  )
);
grant select, insert on public.note_message_photos to authenticated;
