import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

const STATE_COOKIE = 'gcal_oauth_state'
const RETURN_COOKIE = 'gcal_oauth_return_to'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

function requireEnv(name: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET'): string {
	const value = process.env[name]
	if (!value) throw new Error(`Missing env: ${name}`)
	return value
}

export async function GET(req: NextRequest) {
	const url = new URL(req.url)
	const code = url.searchParams.get('code')
	const state = url.searchParams.get('state')

	const expectedState = req.cookies.get(STATE_COOKIE)?.value
	const returnTo = req.cookies.get(RETURN_COOKIE)?.value || '/'
	const redirectUrl = new URL(returnTo, url.origin)
	const res = NextResponse.redirect(redirectUrl)
	res.cookies.delete(STATE_COOKIE)
	res.cookies.delete(RETURN_COOKIE)

	if (!code || !state || !expectedState || state !== expectedState) {
		return res
	}

	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	if (!user) return res

	try {
		const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: requireEnv('GOOGLE_CLIENT_ID'),
				client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
				redirect_uri: `${url.origin}/api/google-calendar/callback`,
				grant_type: 'authorization_code',
			}),
		})

		if (!tokenRes.ok) {
			return res
		}

		const tokenData = (await tokenRes.json()) as { refresh_token?: string }
		if (!tokenData.refresh_token) {
			return res
		}

		await supabase.from('integrations').upsert(
			{
				user_id: user.id,
				provider: 'google_calendar',
				refresh_token: tokenData.refresh_token,
				scopes: 'https://www.googleapis.com/auth/calendar',
			},
			{ onConflict: 'user_id,provider' },
		)
	} catch {
		// Best effort: user can retry connect.
	}

	return res
}
