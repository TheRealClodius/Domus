-- Manual RLS verification for entity isolation policy
-- Run against local Supabase: psql < supabase/tests/entity_isolation_rls.sql
--
-- Prerequisites: supabase db reset (applies all migrations)
-- These tests use set_config to simulate authenticated users.

begin;

-- Setup: create two test users
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bob@test.com');

insert into public.users (id, username) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bob');

-- Setup: Alice owns a space with an entity
insert into public.spaces (id, user_id, name) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Alice Space');

insert into public.entities (id, space_id, user_id, type) values
  ('dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'note');

-- Simulate Alice
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select set_config('role', 'authenticated', true);

-- TEST 1: Owner can SELECT own entity → ALLOWED
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.entities
  where id = 'dddddddd-0000-0000-0000-000000000001';
  if v_count = 1 then
    raise notice 'TEST 1 PASSED: Owner can SELECT own entity';
  else
    raise notice 'TEST 1 FAILED: Owner cannot SELECT own entity (count=%)', v_count;
  end if;
end $$;

-- TEST 2: Owner can UPDATE own entity → ALLOWED
do $$
begin
  update public.entities set summary = 'updated'
  where id = 'dddddddd-0000-0000-0000-000000000001';
  if found then
    raise notice 'TEST 2 PASSED: Owner can UPDATE own entity';
  else
    raise notice 'TEST 2 FAILED: Owner UPDATE returned no rows';
  end if;
end $$;

-- Simulate Bob
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- TEST 3: Non-owner CANNOT SELECT another user's entity → DENIED
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.entities
  where id = 'dddddddd-0000-0000-0000-000000000001';
  if v_count = 0 then
    raise notice 'TEST 3 PASSED: Non-owner cannot SELECT entity in another space';
  else
    raise notice 'TEST 3 FAILED: Non-owner can see entity (count=%)', v_count;
  end if;
end $$;

-- TEST 4: Changing entities.user_id to your own does NOT grant access
-- (This is the old vulnerability — with denormalized user_id RLS, setting
-- user_id = attacker's id would grant access. The new policy joins through spaces.)
do $$
declare
  v_count int;
begin
  -- Bob tries to update the entity's user_id to his own (should see 0 rows)
  update public.entities set user_id = 'aaaaaaaa-0000-0000-0000-000000000002'
  where id = 'dddddddd-0000-0000-0000-000000000001';
  if not found then
    raise notice 'TEST 4 PASSED: Changing user_id does not grant access (0 rows updated)';
  else
    raise notice 'TEST 4 FAILED: Non-owner was able to UPDATE entity user_id';
  end if;
end $$;

-- TEST 5: Non-owner CANNOT INSERT entity into another user's space
do $$
begin
  insert into public.entities (space_id, user_id, type)
  values ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'note');
  raise notice 'TEST 5 FAILED: Non-owner was able to INSERT into another space';
exception when others then
  raise notice 'TEST 5 PASSED: Non-owner INSERT into another space denied — %', sqlerrm;
end $$;

rollback;
