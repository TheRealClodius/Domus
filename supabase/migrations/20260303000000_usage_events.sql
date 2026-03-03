-- Add billing columns to users (added out-of-band; guard for idempotency)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_period_start timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_period_end timestamptz;

-- Usage events (recorded by the agent service via service role)
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_user_type_day
  ON public.usage_events (user_id, event_type, created_at DESC);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage"
  ON public.usage_events FOR SELECT
  USING (auth.uid() = user_id);
-- Service role (agent) bypasses RLS by default for INSERT
