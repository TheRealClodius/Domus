import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

const STATE_COOKIE = 'gcal_oauth_state'
const RETURN_COOKIE = 'gcal_oauth_return_to'

function requireEnv(name: 'GOOGLE_CLIENT_ID'): string {
	const value = process.env[name]
	if (!value) throw new Error(`Missing env: ${name}`)
	return value
}

export async function GET(req: Request) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.redirect(new URL('/', req.url))
	}

	const url = new URL(req.url)
	const returnTo = url.searchParams.get('returnTo') || '/'
	const state = crypto.randomUUID()
	const origin = url.origin
	const redirectUri = `${origin}/api/google-calendar/callback`
	const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')

	authUrl.searchParams.set('client_id', requireEnv('GOOGLE_CLIENT_ID'))
	authUrl.searchParams.set('redirect_uri', redirectUri)
	authUrl.searchParams.set('response_type', 'code')
	authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar')
	authUrl.searchParams.set('access_type', 'offline')
	authUrl.searchParams.set('prompt', 'consent')
	authUrl.searchParams.set('include_granted_scopes', 'true')
	authUrl.searchParams.set('state', state)

	const res = NextResponse.redirect(authUrl)
	res.cookies.set(STATE_COOKIE, state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 10,
	})
	res.cookies.set(RETURN_COOKIE, returnTo, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 10,
	})
	return res
}
