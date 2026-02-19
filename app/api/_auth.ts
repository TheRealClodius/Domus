// SPIKE: entity-as-mcp — dual auth helper for API routes
// Checks service token first (agent calls), falls back to Supabase session cookie (browser).
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/core/supabase/server'

type ServiceAuth = { type: 'service'; space_id: string }
type UserAuth = { type: 'user'; user_id: string; supabase: SupabaseClient }
type AuthError = { type: 'error'; status: number; message: string }

export type AuthResult = ServiceAuth | UserAuth | AuthError

export async function resolveAuth(request: Request): Promise<AuthResult> {
	const authHeader = request.headers.get('authorization')

	// Service token path — agent calls with Bearer token + space_id query param
	if (authHeader?.startsWith('Bearer ')) {
		const token = authHeader.slice(7)
		const expected = process.env.DOMUS_SERVICE_TOKEN
		if (!expected || token !== expected) {
			return { type: 'error', status: 401, message: 'Invalid service token' }
		}
		const url = new URL(request.url)
		const spaceId = url.searchParams.get('space_id')
		if (!spaceId) {
			return { type: 'error', status: 400, message: 'Missing space_id query parameter' }
		}
		return { type: 'service', space_id: spaceId }
	}

	// Cookie path — browser calls with Supabase session
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	if (!user) {
		return { type: 'error', status: 401, message: 'Unauthorized' }
	}
	return { type: 'user', user_id: user.id, supabase }
}
