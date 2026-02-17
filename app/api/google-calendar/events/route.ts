import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/core/supabase/server'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

async function getAccessToken(refreshToken: string): Promise<string> {
	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: process.env.GOOGLE_CLIENT_ID!,
			client_secret: process.env.GOOGLE_CLIENT_SECRET!,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		}),
	})

	if (!res.ok) {
		const body = await res.text()
		if (body.includes('invalid_grant')) {
			throw new Error('TOKEN_REVOKED')
		}
		throw new Error(`Token refresh failed: ${res.status}`)
	}

	const data = await res.json()
	return data.access_token
}

export async function GET(req: NextRequest) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { searchParams } = new URL(req.url)
	const timeMin = searchParams.get('timeMin')
	const timeMax = searchParams.get('timeMax')

	if (!timeMin || !timeMax) {
		return NextResponse.json({ error: 'Missing timeMin or timeMax' }, { status: 400 })
	}

	const { data: integration } = await supabase
		.from('integrations')
		.select('refresh_token')
		.eq('user_id', user.id)
		.eq('provider', 'google_calendar')
		.single()

	if (!integration) {
		return NextResponse.json({ error: 'Not connected' }, { status: 404 })
	}

	try {
		const accessToken = await getAccessToken(integration.refresh_token)

		const calendarParams = new URLSearchParams({
			timeMin,
			timeMax,
			singleEvents: 'true',
			orderBy: 'startTime',
			maxResults: '250',
		})

		const calendarRes = await fetch(
			`${GOOGLE_CALENDAR_API}/calendars/primary/events?${calendarParams}`,
			{ headers: { Authorization: `Bearer ${accessToken}` } },
		)

		if (!calendarRes.ok) {
			throw new Error(`Google API error: ${calendarRes.status}`)
		}

		const calendarData = await calendarRes.json()
		return NextResponse.json(calendarData.items ?? [])
	} catch (err) {
		if ((err as Error).message === 'TOKEN_REVOKED') {
			await supabase
				.from('integrations')
				.delete()
				.eq('user_id', user.id)
				.eq('provider', 'google_calendar')

			return NextResponse.json({ error: 'Token revoked' }, { status: 401 })
		}

		console.error('Google Calendar API error:', err)
		return NextResponse.json({ error: 'Failed to fetch events' }, { status: 502 })
	}
}
