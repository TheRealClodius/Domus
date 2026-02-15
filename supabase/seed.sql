-- Seed: test user + space for local development
-- Run against remote Supabase via: supabase db push --include-seed
-- Or paste into Supabase dashboard SQL Editor.
-- Copy the returned user_id and space_id into .env / test fixtures.

-- pgcrypto needed for crypt() / gen_salt()
create extension if not exists pgcrypto with schema extensions;

-- 1. Create auth user (Supabase Auth internal table)
with new_auth_user as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test@domus.dev',
    extensions.crypt('testpassword123', extensions.gen_salt('bf')),
    now(),
    now(),
    now(),
    '',
    ''
  )
  returning id
),

-- 2. Create public profile
new_user as (
  insert into public.users (id, name, username)
  select id, 'Test User', 'testuser'
  from new_auth_user
  returning id
),

-- 3. Create test space
new_space as (
  insert into public.spaces (id, user_id, name)
  select gen_random_uuid(), id, 'Test Space'
  from new_user
  returning id, user_id
)

-- 4. Set active space and return IDs
update public.users
set active_space_id = new_space.id
from new_space
where public.users.id = new_space.user_id
returning public.users.id as user_id, new_space.id as space_id;
