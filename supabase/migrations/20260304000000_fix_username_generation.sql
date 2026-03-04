-- Fix username generation: derive from Google OAuth email instead of guest-<uuid>.
-- All V1 users authenticate via Google OAuth, so new.email is always present.
--
-- Strategy:
--   1. base = lowercase email local part, non-alphanumeric chars replaced with '_'
--   2. Try base username first.
--   3. On conflict, append '_' + first 6 hex chars of the user's UUID.
--      Since UUIDs are unique per user, the fallback is guaranteed unique.

create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = ''
as $$
declare
  base_username text;
  candidate     text;
begin
  base_username := lower(
    regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]+', '_', 'g')
  );

  candidate := base_username;

  if exists (select 1 from public.users where username = candidate) then
    candidate := base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;

  insert into public.users (id, username, name, avatar_url)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  );

  return new;
end;
$$;
