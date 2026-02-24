-- Allow group owners to update their groups (e.g. avatar_url, name)
create policy "Owners can update their groups"
  on public.chat_groups for update
  using (
    exists (
      select 1 from public.chat_members
      where chat_members.group_id = chat_groups.id
        and chat_members.user_id = auth.uid()
        and chat_members.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.chat_members
      where chat_members.group_id = chat_groups.id
        and chat_members.user_id = auth.uid()
        and chat_members.role = 'owner'
    )
  );

grant update on public.chat_groups to authenticated;
