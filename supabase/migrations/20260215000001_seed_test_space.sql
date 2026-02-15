-- Fix: seed the test space that the seed.sql CTE didn't complete

insert into public.spaces (id, user_id, name)
values (
  gen_random_uuid(),
  'b7b36204-0fc1-49fa-bb0b-de4e18fa4fe3',
  'Test Space'
)
on conflict do nothing;

update public.users
set active_space_id = (
  select id from public.spaces
  where user_id = 'b7b36204-0fc1-49fa-bb0b-de4e18fa4fe3'
  limit 1
)
where id = 'b7b36204-0fc1-49fa-bb0b-de4e18fa4fe3';
