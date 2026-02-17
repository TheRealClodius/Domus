import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
	GOOGLE_CALENDAR_API,
	GoogleCalendarError,
	getGoogleAccessToken,
	revokeIntegration,
} from '@/app/api/google-calendar/_lib'
import { getSupabaseServerClient } from '@/core/supabase/server'

function parseEventId(rawId: string): string {
	return decodeURIComponent(rawId)
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { eventId } = await params
	const body = (await req.json().catch(() => null)) as {
		title?: string
		start?: string
		end?: string
		attendees?: { email: string }[]
	} | null
	if (!body || (!body.title && !body.start && !body.end && !body.attendees)) {
		return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
	}

	const patch: Record<string, unknown> = {}
	if (body.title) patch.summary = body.title
	if (body.start) patch.start = { dateTime: body.start }
	if (body.end) patch.end = { dateTime: body.end }
	if (body.attendees) patch.attendees = body.attendees

	try {
		const accessToken = await getGoogleAccessToken(supabase, user.id)
		const googleRes = await fetch(
			`${GOOGLE_CALENDAR_API}/calendars/primary/events/${parseEventId(eventId)}`,
			{
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(patch),
			},
		)

		if (!googleRes.ok) {
			const detail = await googleRes.text()
			throw new Error(`Google API error: ${googleRes.status} ${detail}`)
		}

		const updated = await googleRes.json()
		return NextResponse.json(updated)
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
		return NextResponse.json({ error: 'Failed to update event' }, { status: 502 })
	}
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const { eventId } = await params
	try {
		const accessToken = await getGoogleAccessToken(supabase, user.id)
		const googleRes = await fetch(
			`${GOOGLE_CALENDAR_API}/calendars/primary/events/${parseEventId(eventId)}`,
			{
				method: 'DELETE',
				headers: { Authorization: `Bearer ${accessToken}` },
			},
		)

		if (!googleRes.ok && googleRes.status !== 404 && googleRes.status !== 410) {
			const detail = await googleRes.text()
			throw new Error(`Google API error: ${googleRes.status} ${detail}`)
		}

		return NextResponse.json({ success: true })
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
		return NextResponse.json({ error: 'Failed to delete event' }, { status: 502 })
	}
}
