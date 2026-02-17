-- Chat tables for cross-space user-to-user messaging

-- Groups
create table public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text,
  invite_code text unique not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Members (composite PK: group + user)
create table public.chat_members (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (group_id, user_id)
);

-- Messages
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  media_url text,
  media_type text,
  created_at timestamptz not null default now()
);

-- Indexes
create index chat_messages_group_created_idx on public.chat_messages(group_id, created_at desc);
create index chat_members_user_idx on public.chat_members(user_id);

-- RLS policies

alter table public.chat_groups enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;

-- chat_groups: SELECT only if user is a member
create policy "Members can view their groups"
  on public.chat_groups for select
  using (
    exists (
      select 1 from public.chat_members
      where chat_members.group_id = chat_groups.id
        and chat_members.user_id = auth.uid()
    )
  );

-- chat_groups: INSERT — any authenticated user can create a group
create policy "Authenticated users can create groups"
  on public.chat_groups for insert
  with check (auth.uid() = created_by);

-- chat_members: SELECT own memberships
create policy "Users can view their own memberships"
  on public.chat_members for select
  using (user_id = auth.uid());

-- chat_members: INSERT — owner can add members, or user joining via invite
create policy "Users can join groups"
  on public.chat_members for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.chat_members
      where chat_members.group_id = chat_members.group_id
        and chat_members.user_id = auth.uid()
        and chat_members.role = 'owner'
    )
  );

-- chat_members: UPDATE own last_read_at
create policy "Users can update their own membership"
  on public.chat_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- chat_messages: SELECT only if member of the group
create policy "Members can view group messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_members
      where chat_members.group_id = chat_messages.group_id
        and chat_members.user_id = auth.uid()
    )
  );

-- chat_messages: INSERT only if member of the group
create policy "Members can send messages"
  on public.chat_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_members
      where chat_members.group_id = chat_messages.group_id
        and chat_members.user_id = auth.uid()
    )
  );
