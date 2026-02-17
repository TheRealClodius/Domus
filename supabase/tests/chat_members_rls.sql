-- Manual RLS verification for chat_members INSERT policy
-- Run against local Supabase: psql < supabase/tests/chat_members_rls.sql
--
-- Prerequisites: supabase db reset (applies all migrations)
-- These tests use set_config to simulate authenticated users.

begin;

-- Setup: create two test users in auth.users and public.users
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bob@test.com');

insert into public.users (id, username) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'bob');

-- Setup: Alice creates a group (bypasses RLS via direct insert for test setup)
insert into public.chat_groups (id, name, invite_code, created_by) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Test Group', 'TESTCODE', 'aaaaaaaa-0000-0000-0000-000000000001');

-- Simulate Alice (group creator)
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select set_config('role', 'authenticated', true);

-- TEST 1: Creator can self-add as owner → ALLOWED
do $$
begin
  insert into public.chat_members (group_id, user_id, role)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'owner');
  raise notice 'TEST 1 PASSED: Creator self-add as owner allowed';
exception when others then
  raise notice 'TEST 1 FAILED: Creator self-add as owner denied — %', sqlerrm;
end $$;

-- Simulate Bob (non-creator)
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- TEST 2: Non-creator self-insert as member → DENIED
do $$
begin
  insert into public.chat_members (group_id, user_id, role)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'member');
  raise notice 'TEST 2 FAILED: Non-creator member self-join should be denied';
exception when others then
  raise notice 'TEST 2 PASSED: Non-creator member self-join denied — %', sqlerrm;
end $$;

-- TEST 3: Non-creator self-insert as owner → DENIED
do $$
begin
  insert into public.chat_members (group_id, user_id, role)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'owner');
  raise notice 'TEST 3 FAILED: Non-creator owner self-add should be denied';
exception when others then
  raise notice 'TEST 3 PASSED: Non-creator owner self-add denied — %', sqlerrm;
end $$;

-- TEST 4: RPC join with valid invite code → ALLOWED
do $$
declare
  v_result public.chat_groups;
begin
  select * into v_result from public.join_group_via_invite('TESTCODE');
  if v_result.id is not null then
    raise notice 'TEST 4 PASSED: RPC join with valid invite code succeeded';
  else
    raise notice 'TEST 4 FAILED: RPC join returned null';
  end if;
exception when others then
  raise notice 'TEST 4 FAILED: RPC join with valid invite code — %', sqlerrm;
end $$;

-- TEST 5: RPC join with invalid invite code → FAILS
do $$
declare
  v_result public.chat_groups;
begin
  select * into v_result from public.join_group_via_invite('BADCODE');
  raise notice 'TEST 5 FAILED: RPC join with bad invite code should fail';
exception when others then
  raise notice 'TEST 5 PASSED: RPC join with bad invite code denied — %', sqlerrm;
end $$;

rollback;
