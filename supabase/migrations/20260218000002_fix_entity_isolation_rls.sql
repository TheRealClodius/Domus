-- Fix entity isolation: join through spaces table instead of trusting denormalized user_id
-- Previously: using (user_id = auth.uid()) — attacker could bypass space isolation
-- Now: using (space_id in (select id from spaces where user_id = auth.uid()))

drop policy "users crud own entities" on public.entities;

create policy "users crud own entities" on public.entities for all
  using (space_id in (select id from public.spaces where user_id = auth.uid()));
