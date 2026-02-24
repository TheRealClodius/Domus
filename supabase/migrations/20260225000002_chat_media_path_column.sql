-- Add media_path column to chat_messages.
-- Stores the storage object key (e.g. {userId}/chat/{groupId}/{messageId}/file.jpg).
-- New messages use media_path; old media_url rows degrade gracefully (expired signed URLs).

alter table public.chat_messages
  add column media_path text;
