-- Create private bucket for chat media
insert into storage.buckets (id, name, public) values ('chat-media', 'chat-media', false)
on conflict (id) do update set public = false;

-- Users can upload to their own folder
create policy "Users can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read files in their groups
create policy "Users can read group media"
  on storage.objects for select
  using (
    bucket_id = 'chat-media'
    and auth.role() = 'authenticated'
  );
