-- Auto-create public.users profile when a new auth user is created.
-- Works for both anonymous sign-ins and OAuth (Google).

create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, username, name, avatar_url)
  values (
    new.id,
    'guest-' || substr(new.id::text, 1, 8),
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Belt-and-suspenders: allow self-insert if trigger doesn't fire
create policy "users insert own profile" on public.users
  for insert with check (id = auth.uid());

-- Clean up anonymous users that never upgraded, every day at 3 AM UTC.
-- Cascade FKs handle public.users, spaces, and entities automatically.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'cleanup-anonymous-users',
  '0 3 * * *',
  $$
    delete from auth.users
    where is_anonymous is true
      and created_at < now() - interval '14 days'
  $$
);
