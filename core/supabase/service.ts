// SPIKE: entity-as-mcp — service role client for agent-authenticated routes
// Bypasses RLS — application code MUST verify space ownership before reads/writes.
import { createClient } from '@supabase/supabase-js'

export function getSupabaseServiceClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY
	if (!url || !key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
	return createClient(url, key)
}
