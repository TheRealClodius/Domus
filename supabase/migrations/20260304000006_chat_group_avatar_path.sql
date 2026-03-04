alter table public.chat_groups
  add column if not exists avatar_path text;
