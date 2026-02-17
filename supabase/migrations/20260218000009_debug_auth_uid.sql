-- Temporary diagnostic function to check auth context
create or replace function public.debug_auth()
returns jsonb
language sql
security invoker
as $$
  select jsonb_build_object(
    'uid', auth.uid(),
    'role', auth.role(),
    'jwt', auth.jwt()
  );
$$;

grant execute on function public.debug_auth() to authenticated;
