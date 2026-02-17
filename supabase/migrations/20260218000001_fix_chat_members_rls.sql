-- Fix chat_members RLS: prevent unauthorized self-join
-- Previously any authenticated user could INSERT themselves into any group
-- knowing only the group_id. Now only group creators can self-add as owner
-- (during group creation), and all other joins go through the RPC.

-- 1. Create RPC for invite-code-based joining (SECURITY DEFINER bypasses RLS)
create or replace function public.join_group_via_invite(p_invite_code text)
returns public.chat_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.chat_groups;
begin
  -- Look up group by invite code
  select * into v_group
  from public.chat_groups
  where invite_code = p_invite_code;

  if v_group is null then
    raise exception 'Invalid invite code';
  end if;

  -- Insert the calling user as a member
  insert into public.chat_members (group_id, user_id, role)
  values (v_group.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group;
end;
$$;

-- Restrict execution to authenticated users only
revoke execute on function public.join_group_via_invite(text) from public;
revoke execute on function public.join_group_via_invite(text) from anon;
grant execute on function public.join_group_via_invite(text) to authenticated;

-- 2. Drop the old permissive INSERT policy
drop policy "Users can join groups" on public.chat_members;

-- 3. Create restricted INSERT policy: only group creator can self-add as owner
create policy "Creator can self-add as owner"
  on public.chat_members for insert
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.chat_groups
      where id = chat_members.group_id
        and created_by = auth.uid()
    )
  );
