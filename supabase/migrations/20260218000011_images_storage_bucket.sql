-- Create public bucket for generated images (agent uploads via service role key)
insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict (id) do update set public = true;
