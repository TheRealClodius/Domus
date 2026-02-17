-- RPC for group creation (SECURITY DEFINER bypasses RLS).
-- Atomically creates the group and adds the caller as owner member.

create or replace function public.create_chat_group(p_name text)
returns public.chat_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.chat_groups;
  v_invite_code text;
begin
  -- Generate a short invite code
  v_invite_code := substr(gen_random_uuid()::text, 1, 8);

  -- Create the group
  insert into public.chat_groups (name, invite_code, created_by)
  values (p_name, v_invite_code, auth.uid())
  returning * into v_group;

  -- Add creator as owner member
  insert into public.chat_members (group_id, user_id, role)
  values (v_group.id, auth.uid(), 'owner');

  return v_group;
end;
$$;

-- Restrict to authenticated users only
revoke execute on function public.create_chat_group(text) from public;
revoke execute on function public.create_chat_group(text) from anon;
grant execute on function public.create_chat_group(text) to authenticated;

-- Drop the temporary debug function
drop function if exists public.debug_auth();
