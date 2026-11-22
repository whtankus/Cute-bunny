create table if not exists public.profile_heart_totals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  heart_count bigint not null default 0 check (heart_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.profile_heart_totals enable row level security;
drop policy if exists "Read profile heart totals" on public.profile_heart_totals;
create policy "Read profile heart totals"
  on public.profile_heart_totals for select to authenticated using (true);
grant select on public.profile_heart_totals to authenticated;

insert into public.profile_heart_totals (user_id, heart_count)
select m.owner_id, count(*)::bigint
from public.memory_likes ml
join public.memories m on m.id = ml.memory_id
group by m.owner_id
on conflict (user_id) do update
set heart_count = greatest(public.profile_heart_totals.heart_count, excluded.heart_count),
    updated_at = now();

create or replace function private.record_profile_heart()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_id uuid;
begin
  select owner_id into recipient_id
  from public.memories
  where id = new.memory_id;

  if recipient_id is not null and recipient_id <> new.user_id then
    insert into public.profile_heart_totals (user_id, heart_count, updated_at)
    values (recipient_id, 1, now())
    on conflict (user_id) do update
      set heart_count = public.profile_heart_totals.heart_count + 1,
          updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function private.record_profile_heart() from public, anon, authenticated;
drop trigger if exists on_memory_like_record_profile_heart on public.memory_likes;
create trigger on_memory_like_record_profile_heart
after insert on public.memory_likes
for each row execute function private.record_profile_heart();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profile_heart_totals'
  ) then
    alter publication supabase_realtime add table public.profile_heart_totals;
  end if;
end $$;
