-- RPC: find or create a DM conversation with another user
-- Returns the chat_groups row for the DM.
-- SECURITY DEFINER: needs to insert into chat_members for both users.

create or replace function public.find_or_create_dm(p_other_user_id uuid)
returns public.chat_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_group_id uuid;
  v_group public.chat_groups;
begin
  -- Guard: no self-DM
  if v_caller = p_other_user_id then
    raise exception 'Cannot create a DM with yourself';
  end if;

  -- Guard: target user must exist
  if not exists (select 1 from auth.users where id = p_other_user_id) then
    raise exception 'Target user does not exist';
  end if;

  -- Canonical ordering for dedup
  if v_caller < p_other_user_id then
    v_a := v_caller;
    v_b := p_other_user_id;
  else
    v_a := p_other_user_id;
    v_b := v_caller;
  end if;

  -- Check for existing DM
  select dp.group_id into v_group_id
  from public.chat_dm_pairs dp
  where dp.user_a = v_a and dp.user_b = v_b;

  if v_group_id is not null then
    select * into v_group from public.chat_groups where id = v_group_id;
    return v_group;
  end if;

  -- Create new DM group
  insert into public.chat_groups (kind, name, invite_code, created_by)
  values ('dm', null, gen_random_uuid()::text, v_caller)
  returning id into v_group_id;

  -- Add both users as members
  insert into public.chat_members (group_id, user_id, role)
  values (v_group_id, v_caller, 'owner'),
         (v_group_id, p_other_user_id, 'member');

  -- Insert dedup row — handle race condition
  begin
    insert into public.chat_dm_pairs (group_id, user_a, user_b)
    values (v_group_id, v_a, v_b);
  exception when unique_violation then
    -- Another transaction won the race. Clean up our group and return theirs.
    delete from public.chat_groups where id = v_group_id;

    select dp.group_id into v_group_id
    from public.chat_dm_pairs dp
    where dp.user_a = v_a and dp.user_b = v_b;

    select * into v_group from public.chat_groups where id = v_group_id;
    return v_group;
  end;

  select * into v_group from public.chat_groups where id = v_group_id;
  return v_group;
end;
$$;

-- Only authenticated users can call this
revoke execute on function public.find_or_create_dm(uuid) from public, anon;
grant execute on function public.find_or_create_dm(uuid) to authenticated;
