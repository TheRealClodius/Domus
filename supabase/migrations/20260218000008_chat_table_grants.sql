-- Ensure authenticated role has proper access to chat tables.
-- The RLS policies already restrict which rows are accessible,
-- but the role needs base table privileges to reach them.

grant select, insert on public.chat_groups to authenticated;
grant select, insert, update on public.chat_members to authenticated;
grant select, insert on public.chat_messages to authenticated;
