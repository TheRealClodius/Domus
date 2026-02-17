'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { GoogleCalendarEventRaw } from '@/apps/calendar/googleCalendarTypes'
import type { CalendarEventState } from '@/apps/calendar/types'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'

interface UseGoogleCalendarEventsResult {
	events: CalendarEvent[]
	isLoading: boolean
	error: string | null
	refetch: () => Promise<void>
}

function mapApiError(status: number, error: string | null): string {
	if (status === 401 || error === 'Token revoked')
		return 'Google connection expired. Reconnect Google Calendar.'
	if (status === 404 || error === 'Not connected') return 'Google Calendar is not connected.'
	if (status === 403) {
		return (
			error ??
			'Google Calendar access forbidden. Reconnect Google Calendar and verify Calendar API is enabled for the OAuth client project.'
		)
	}
	if (status === 500 && error === 'Google Calendar OAuth is not configured') {
		return 'Server Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
	}
	return `Google Calendar fetch failed (${status})`
}

/** Maps a Google Calendar API event to our CalendarEvent shape. */
export function mapGoogleEvent(raw: GoogleCalendarEventRaw): CalendarEvent {
	const isAllDay = !raw.start.dateTime
	const start = raw.start.dateTime ?? `${raw.start.date}T00:00:00`
	const end = raw.end.dateTime ?? `${raw.end.date}T00:00:00`

	const state: CalendarEventState = {
		title: raw.summary || '(No title)',
		start,
		end,
		all_day: isAllDay,
		color: 'cool',
	}

	return {
		id: `gcal-${raw.id}`,
		space_id: '',
		user_id: '',
		type: 'calendar_event',
		presentation: 'hidden',
		position: { x: 0, y: 0, locked: false },
		size: { width: 0, height: 0 },
		z_index: 0,
		content: '',
		state,
		summary: state.title,
		created_by: 'user',
		archived: false,
		created_at: start,
		updated_at: start,
		source: 'google',
	}
}

export function useGoogleCalendarEvents(
	range: { start: string; end: string },
	enabled: boolean,
): UseGoogleCalendarEventsResult {
	const [events, setEvents] = useState<CalendarEvent[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const abortRef = useRef<AbortController | null>(null)

	const fetchEvents = useCallback(async () => {
		if (!enabled) {
			setEvents([])
			return
		}

		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

		setIsLoading(true)
		setError(null)

		try {
			const params = new URLSearchParams({
				timeMin: range.start,
				timeMax: range.end,
			})
			const res = await fetch(`/api/google-calendar/events?${params}`, {
				signal: controller.signal,
			})

			if (!res.ok) {
				const payload = (await res.json().catch(() => null)) as { error?: string } | null
				const mapped = mapApiError(res.status, payload?.error ?? null)
				if (res.status === 401 || res.status === 404) {
					setError('disconnected')
					setEvents([])
					return
				}
				throw new Error(mapped)
			}

			const data: GoogleCalendarEventRaw[] = await res.json()
			setEvents(data.map(mapGoogleEvent))
		} catch (err) {
			if ((err as Error).name === 'AbortError') return
			setError((err as Error).message)
			setEvents([])
		} finally {
			setIsLoading(false)
		}
	}, [range.start, range.end, enabled])

	useEffect(() => {
		void fetchEvents()
		return () => abortRef.current?.abort()
	}, [fetchEvents])

	useEffect(() => {
		if (!enabled) return

		const intervalId = window.setInterval(() => {
			void fetchEvents()
		}, 60_000)

		const handleFocus = () => {
			void fetchEvents()
		}
		const handleVisibilityChange = () => {
			if (!document.hidden) {
				void fetchEvents()
			}
		}

		window.addEventListener('focus', handleFocus)
		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			window.clearInterval(intervalId)
			window.removeEventListener('focus', handleFocus)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [enabled, fetchEvents])

	return { events, isLoading, error, refetch: fetchEvents }
}
