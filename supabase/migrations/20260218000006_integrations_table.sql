-- Third-party OAuth integrations (e.g. Google Calendar)
-- One row per provider per user; reconnecting upserts via unique constraint.

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  refresh_token text not null,
  scopes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint integrations_user_provider_unique unique (user_id, provider)
);

alter table public.integrations enable row level security;

create policy "users crud own integrations" on public.integrations
  for all using (user_id = auth.uid());

create trigger integrations_updated_at
  before update on public.integrations
  for each row execute function update_updated_at();
