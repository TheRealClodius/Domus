-- Backfill usernames for existing users that still have the guest-<uuid> default.
-- Applies the same logic as the updated handle_new_user trigger.
-- Falls back to guest-<uuid> if the auth user has no email (legacy anonymous users).

do $$
declare
  rec           record;
  base_username text;
  candidate     text;
begin
  for rec in
    select u.id, a.email
    from public.users u
    join auth.users a on a.id = u.id
    where u.username like 'guest-%'
  loop
    if rec.email is null or rec.email = '' then
      -- Legacy anonymous user with no email — keep a sanitised guest-<uuid> slug
      candidate := 'guest_' || substr(replace(rec.id::text, '-', ''), 1, 8);
    else
      base_username := lower(
        regexp_replace(split_part(rec.email, '@', 1), '[^a-z0-9]+', '_', 'g')
      );

      candidate := base_username;

      if exists (
        select 1 from public.users
        where username = candidate and id <> rec.id
      ) then
        candidate := base_username || '_' || substr(replace(rec.id::text, '-', ''), 1, 6);
      end if;
    end if;

    update public.users set username = candidate where id = rec.id;
  end loop;
end;
$$;
