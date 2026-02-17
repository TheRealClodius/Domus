import type { SupabaseClient } from '@supabase/supabase-js'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

export class GoogleCalendarError extends Error {
	code: 'NOT_CONNECTED' | 'TOKEN_REVOKED' | 'TOKEN_REFRESH_FAILED'

	constructor(code: 'NOT_CONNECTED' | 'TOKEN_REVOKED' | 'TOKEN_REFRESH_FAILED', message: string) {
		super(message)
		this.code = code
	}
}

async function getRefreshToken(supabase: SupabaseClient, userId: string): Promise<string> {
	const { data: integration } = await supabase
		.from('integrations')
		.select('refresh_token')
		.eq('user_id', userId)
		.eq('provider', 'google_calendar')
		.single()

	if (!integration?.refresh_token) {
		throw new GoogleCalendarError('NOT_CONNECTED', 'Google Calendar is not connected')
	}

	return integration.refresh_token
}

export async function revokeIntegration(supabase: SupabaseClient, userId: string): Promise<void> {
	await supabase
		.from('integrations')
		.delete()
		.eq('user_id', userId)
		.eq('provider', 'google_calendar')
}

function requireEnv(name: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET'): string {
	const value = process.env[name]
	if (!value) {
		throw new GoogleCalendarError('TOKEN_REFRESH_FAILED', `Missing env: ${name}`)
	}
	return value
}

export async function getGoogleAccessToken(
	supabase: SupabaseClient,
	userId: string,
): Promise<string> {
	const refreshToken = await getRefreshToken(supabase, userId)

	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: requireEnv('GOOGLE_CLIENT_ID'),
			client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		}),
	})

	if (!res.ok) {
		const body = await res.text()
		if (body.includes('invalid_grant')) {
			throw new GoogleCalendarError('TOKEN_REVOKED', 'Google Calendar refresh token was revoked')
		}
		throw new GoogleCalendarError('TOKEN_REFRESH_FAILED', `Token refresh failed: ${res.status}`)
	}

	const data = await res.json()
	return data.access_token
}
