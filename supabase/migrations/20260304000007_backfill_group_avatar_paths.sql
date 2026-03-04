-- Backfill avatar_path for groups that have an old (now-expired) signed URL in avatar_url.
-- Supabase signed URL format: https://<host>/storage/v1/object/sign/chat-media/<path>?token=<jwt>
-- We extract <path> and store it as avatar_path, then clear avatar_url.
-- On next load, ChatApp will call /api/chat/media?path=<path> to get a fresh signed URL.

update public.chat_groups
set
  avatar_path = (regexp_match(avatar_url, '/object/sign/chat-media/([^?]+)'))[1],
  avatar_url  = null
where avatar_url is not null
  and avatar_path is null
  and avatar_url like '%/object/sign/chat-media/%';
