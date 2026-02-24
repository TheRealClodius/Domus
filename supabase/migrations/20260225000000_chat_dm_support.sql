-- DM support: add kind column to chat_groups, make name nullable, create dedup table

-- Add kind column (dm vs group)
alter table public.chat_groups
  add column kind text not null default 'group'
  check (kind in ('dm', 'group'));

-- Make name nullable — DMs derive display name from partner profile
alter table public.chat_groups
  alter column name drop not null;

-- Dedup table: one DM per user pair
create table public.chat_dm_pairs (
  group_id uuid primary key references public.chat_groups(id) on delete cascade,
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  check (user_a < user_b),
  unique (user_a, user_b)
);

alter table public.chat_dm_pairs enable row level security;

-- SELECT only if caller is a member of the DM group
create policy "Members can view DM pairs"
  on public.chat_dm_pairs for select
  using (
    exists (
      select 1 from public.chat_members
      where chat_members.group_id = chat_dm_pairs.group_id
        and chat_members.user_id = auth.uid()
    )
  );

grant select on public.chat_dm_pairs to authenticated;
