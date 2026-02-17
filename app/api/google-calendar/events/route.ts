import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
	GOOGLE_CALENDAR_API,
	GoogleCalendarError,
	getGoogleAccessToken,
	revokeIntegration,
} from '@/app/api/google-calendar/_lib'
import { getSupabaseServerClient } from '@/core/supabase/server'

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

	try {
		const accessToken = await getGoogleAccessToken(supabase, user.id)

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
			const detail = await calendarRes.text()
			throw new Error(`Google API error: ${calendarRes.status} ${detail}`)
		}

		const calendarData = await calendarRes.json()
		return NextResponse.json(calendarData.items ?? [])
	} catch (err) {
		if (err instanceof GoogleCalendarError) {
			if (err.code === 'NOT_CONNECTED') {
				return NextResponse.json({ error: 'Not connected' }, { status: 404 })
			}
			if (err.code === 'TOKEN_REVOKED') {
				await revokeIntegration(supabase, user.id)
				return NextResponse.json({ error: 'Token revoked' }, { status: 401 })
			}
			if (err.code === 'TOKEN_REFRESH_FAILED') {
				return NextResponse.json(
					{ error: 'Google Calendar OAuth is not configured' },
					{ status: 500 },
				)
			}
		}
		if ((err as Error).message.includes('Google API error: 403')) {
			const detail = (err as Error).message.replace(/^Google API error:\s*403\s*/i, '').trim()
			return NextResponse.json(
				{
					error: `Google Calendar access forbidden. ${detail}`,
				},
				{ status: 403 },
			)
		}

		console.error('Google Calendar API error:', err)
		return NextResponse.json({ error: 'Failed to fetch events' }, { status: 502 })
	}
}

export async function POST(req: NextRequest) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const body = (await req.json().catch(() => null)) as {
		title?: string
		start?: string
		end?: string
		attendees?: { email: string }[]
		timeZone?: string
	} | null
	const title = body?.title?.trim()
	const start = body?.start
	const end = body?.end

	if (!title || !start || !end) {
		return NextResponse.json({ error: 'Missing title/start/end' }, { status: 400 })
	}

	try {
		const accessToken = await getGoogleAccessToken(supabase, user.id)
		const googleRes = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				summary: title,
				start: { dateTime: start, ...(body.timeZone && { timeZone: body.timeZone }) },
				end: { dateTime: end, ...(body.timeZone && { timeZone: body.timeZone }) },
				...(body.attendees?.length && { attendees: body.attendees }),
			}),
		})

		if (!googleRes.ok) {
			const detail = await googleRes.text()
			throw new Error(`Google API error: ${googleRes.status} ${detail}`)
		}

		const created = await googleRes.json()
		return NextResponse.json(created, { status: 201 })
	} catch (err) {
		if (err instanceof GoogleCalendarError) {
			if (err.code === 'NOT_CONNECTED') {
				return NextResponse.json({ error: 'Not connected' }, { status: 404 })
			}
			if (err.code === 'TOKEN_REVOKED') {
				await revokeIntegration(supabase, user.id)
				return NextResponse.json({ error: 'Token revoked' }, { status: 401 })
			}
			if (err.code === 'TOKEN_REFRESH_FAILED') {
				return NextResponse.json(
					{ error: 'Google Calendar OAuth is not configured' },
					{ status: 500 },
				)
			}
		}
		if ((err as Error).message.includes('Google API error: 403')) {
			const detail = (err as Error).message.replace(/^Google API error:\s*403\s*/i, '').trim()
			return NextResponse.json(
				{
					error: `Google Calendar access forbidden. ${detail}`,
				},
				{ status: 403 },
			)
		}

		console.error('Google Calendar API error:', err)
		return NextResponse.json({ error: 'Failed to create event' }, { status: 502 })
	}
}
