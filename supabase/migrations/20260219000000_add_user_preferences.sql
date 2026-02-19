-- Add a JSONB preferences column to users for theme customization and future settings.
-- RLS already covers own-row read/update via existing policies.
alter table public.users add column preferences jsonb not null default '{}';
