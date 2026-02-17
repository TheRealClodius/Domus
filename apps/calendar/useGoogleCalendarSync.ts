'use client'

import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import type { GoogleCalendarEventRaw } from '@/apps/calendar/googleCalendarTypes'
import type { CalendarEventState } from '@/apps/calendar/types'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

interface UseGoogleCalendarSyncResult {
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

/** Maps a raw Google Calendar event to CalendarEventState with gcal_id. */
function mapGoogleEventToState(raw: GoogleCalendarEventRaw): CalendarEventState {
	const isAllDay = !raw.start.dateTime
	return {
		title: raw.summary || '(No title)',
		start: raw.start.dateTime ?? `${raw.start.date}T00:00:00`,
		end: raw.end.dateTime ?? `${raw.end.date}T00:00:00`,
		all_day: isAllDay,
		color: 'cool',
		gcal_id: raw.id,
		...(raw.attendees && { attendees: raw.attendees }),
	}
}

/** Returns true if the entity's calendar state matches the Google data. */
function stateMatchesGoogle(entity: Entity, googleState: CalendarEventState): boolean {
	const s = entity.state as CalendarEventState
	return (
		s.title === googleState.title &&
		s.start === googleState.start &&
		s.end === googleState.end &&
		s.all_day === googleState.all_day &&
		JSON.stringify(s.attendees ?? []) === JSON.stringify(googleState.attendees ?? [])
	)
}

/**
 * Inbound sync: fetches Google Calendar events and mirrors them as entities.
 * Polls every 60s, on focus, and on visibility change.
 */
export function useGoogleCalendarSync(
	range: { start: string; end: string },
	enabled: boolean,
	entityId: string,
	syncingRef: MutableRefObject<boolean>,
): UseGoogleCalendarSyncResult {
	const [error, setError] = useState<string | null>(null)
	const abortRef = useRef<AbortController | null>(null)
	const upsert = useEntityStore((s) => s.upsert)
	const archive = useEntityStore((s) => s.archive)
	const getEntity = useEntityStore((s) => s.getEntity)

	const fetchAndSync = useCallback(async () => {
		if (!enabled) return

		abortRef.current?.abort()
		const controller = new AbortController()
		abortRef.current = controller

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
					return
				}
				throw new Error(mapped)
			}

			const data: GoogleCalendarEventRaw[] = await res.json()
			const calendarEntity = getEntity(entityId)
			if (!calendarEntity) return

			const { space_id, user_id } = calendarEntity

			// Build set of gcal_ids from Google's response
			const fetchedGcalIds = new Set(data.map((raw) => raw.id))

			// Get all current entities with gcal_id in this range
			const entities = useEntityStore.getState().entities
			const existingByGcalId = new Map<string, Entity>()
			for (const e of Object.values(entities)) {
				if (e.type !== 'calendar_event' || e.archived) continue
				const gcalId = (e.state as CalendarEventState).gcal_id
				if (gcalId) existingByGcalId.set(gcalId, e)
			}

			syncingRef.current = true

			// Upsert entities for each Google event
			for (const raw of data) {
				const googleState = mapGoogleEventToState(raw)
				const existing = existingByGcalId.get(raw.id)

				if (existing) {
					// Only update if Google data actually changed
					if (!stateMatchesGoogle(existing, googleState)) {
						upsert({
							...existing,
							state: { ...existing.state, ...googleState },
							summary: googleState.title,
							updated_at: new Date().toISOString(),
						})
					}
				} else {
					// Create new entity mirroring the Google event
					upsert({
						id: crypto.randomUUID(),
						space_id,
						user_id,
						type: 'calendar_event',
						presentation: 'hidden',
						position: { x: 0, y: 0, locked: false },
						size: { width: 0, height: 0 },
						z_index: 0,
						content: '',
						state: googleState,
						summary: googleState.title,
						created_by: 'user',
						archived: false,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					})
				}
			}

			// Archive entities whose gcal_id was not in Google's response
			// but whose time overlaps the fetched range (i.e. Google deleted them)
			for (const [gcalId, entity] of existingByGcalId) {
				if (fetchedGcalIds.has(gcalId)) continue
				const s = entity.state as CalendarEventState
				// Only archive if the event overlaps the fetched range
				if (s.start < range.end && s.end > range.start) {
					archive(entity.id)
				}
			}

			// Keep flag true through React's render cycle so outbound sync skips
			setTimeout(() => {
				syncingRef.current = false
			}, 0)
		} catch (err) {
			syncingRef.current = false
			if ((err as Error).name === 'AbortError') return
			setError((err as Error).message)
		}
	}, [range.start, range.end, enabled, entityId, getEntity, upsert, archive, syncingRef])

	// Fetch on mount and range change
	useEffect(() => {
		void fetchAndSync()
		return () => abortRef.current?.abort()
	}, [fetchAndSync])

	// Poll every 60s, refetch on focus and visibility
	useEffect(() => {
		if (!enabled) return

		const intervalId = window.setInterval(() => {
			void fetchAndSync()
		}, 60_000)

		const handleFocus = () => {
			void fetchAndSync()
		}
		const handleVisibilityChange = () => {
			if (!document.hidden) void fetchAndSync()
		}

		window.addEventListener('focus', handleFocus)
		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			window.clearInterval(intervalId)
			window.removeEventListener('focus', handleFocus)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [enabled, fetchAndSync])

	return { error, refetch: fetchAndSync }
}
