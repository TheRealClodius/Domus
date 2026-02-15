-- 001_init.sql

-- Users (managed by Supabase Auth, this extends the profile)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  username text unique not null,
  avatar_url text,
  active_space_id uuid,
  created_at timestamptz default now()
);

-- Spaces
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'My Space',
  focused_entity_id uuid,
  created_at timestamptz default now()
);

-- Space templates (entity blueprints for new spaces)
create table public.space_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  entities jsonb not null,
  is_system boolean not null default false,
  created_at timestamptz default now()
);

-- Add FK for active_space_id after spaces table exists
alter table public.users
  add constraint users_active_space_id_fkey
  foreign key (active_space_id) references public.spaces(id) on delete set null;

-- Entities (the only table that matters)
create table public.entities (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  presentation text not null default 'window',
  position jsonb not null default '{"x": 50, "y": 50, "locked": false}',
  size jsonb not null default '{"width": 600, "height": 400}',
  z_index int not null default 0,
  state jsonb not null default '{}',
  summary text,
  created_by text not null default 'user',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index entities_space_id_idx on public.entities(space_id) where not archived;
create index entities_type_idx on public.entities(space_id, type) where not archived;

-- Full-text search index
create index entities_summary_fts_idx on public.entities
  using gin (to_tsvector('english', coalesce(summary, '')));

-- Row-Level Security
alter table public.users enable row level security;
alter table public.spaces enable row level security;
alter table public.entities enable row level security;

create policy "users read own profile" on public.users for select using (id = auth.uid());
create policy "users read public profiles" on public.users for select using (true);
create policy "users update own profile" on public.users for update using (id = auth.uid());

create policy "users crud own spaces" on public.spaces for all using (user_id = auth.uid());

create policy "users crud own entities" on public.entities for all using (user_id = auth.uid());

alter table public.space_templates enable row level security;
create policy "anyone can read system templates" on public.space_templates for select using (is_system = true);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger entities_updated_at
  before update on public.entities
  for each row execute function update_updated_at();

-- JSON Merge Patch (RFC 7396) for agent state updates
create or replace function jsonb_merge_patch(target jsonb, patch jsonb)
returns jsonb as $$
declare
  key text;
  value jsonb;
  result jsonb := target;
begin
  if jsonb_typeof(patch) != 'object' then
    return patch;
  end if;
  for key, value in select * from jsonb_each(patch)
  loop
    if value = 'null'::jsonb then
      result := result - key;
    elsif jsonb_typeof(value) = 'object'
      and jsonb_typeof(result -> key) = 'object' then
      result := jsonb_set(result, array[key], jsonb_merge_patch(result -> key, value));
    else
      result := jsonb_set(result, array[key], value, true);
    end if;
  end loop;
  return result;
end;
$$ language plpgsql immutable;
