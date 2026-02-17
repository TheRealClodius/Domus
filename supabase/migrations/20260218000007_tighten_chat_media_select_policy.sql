-- Fix: tighten chat-media SELECT policy from any-authenticated to owner-only.
-- Signed URLs are shared via message media_url — recipients don't need direct
-- storage SELECT access; the signed token authenticates the request.

drop policy if exists "Users can read group media" on storage.objects;

create policy "Users can read own media"
  on storage.objects for select
  using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
