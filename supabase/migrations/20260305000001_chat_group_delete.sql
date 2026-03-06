-- Allow group owners to delete their groups
create policy "Owners can delete their groups"
  on public.chat_groups for delete
  using (
    exists (
      select 1 from public.chat_members
      where chat_members.group_id = chat_groups.id
        and chat_members.user_id = auth.uid()
        and chat_members.role = 'owner'
    )
  );

grant delete on public.chat_groups to authenticated;
