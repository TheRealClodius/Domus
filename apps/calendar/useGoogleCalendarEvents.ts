'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { GoogleCalendarEventRaw } from '@/apps/calendar/googleCalendarTypes'
import type { CalendarEventState } from '@/apps/calendar/types'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'

interface UseGoogleCalendarEventsResult {
	events: CalendarEvent[]
	isLoading: boolean
	error: string | null
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
				if (res.status === 401) {
					setError('disconnected')
					setEvents([])
					return
				}
				throw new Error(`Google Calendar fetch failed: ${res.status}`)
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
		fetchEvents()
		return () => abortRef.current?.abort()
	}, [fetchEvents])

	return { events, isLoading, error }
}
