alter table public.entities replica identity full;
alter publication supabase_realtime add table public.entities;
