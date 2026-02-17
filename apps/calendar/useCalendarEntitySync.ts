'use client'

import { type MutableRefObject, useEffect, useRef } from 'react'
import type { CalendarEventState } from '@/apps/calendar/types'
import { useEntityStore } from '@/core/entityStore'

/**
 * Outbound sync: pushes local calendar entity changes to Google Calendar.
 *
 * Three cases:
 * 1. Entity has gcal_id + state changed since last sync → PATCH Google
 * 2. Entity has no gcal_id (agent/user-created) → POST Google, set gcal_id
 * 3. Entity has gcal_id + archived → DELETE from Google
 */
export function useCalendarEntitySync(
	isConnected: boolean,
	syncingFromGoogleRef: MutableRefObject<boolean>,
): void {
	const entities = useEntityStore((s) => s.entities)
	const upsert = useEntityStore((s) => s.upsert)

	// Snapshot of last-synced state per entity, used for change detection
	const syncedSnapshotRef = useRef(new Map<string, string>())
	// Entities currently being synced (prevent double-sends)
	const inFlightRef = useRef(new Set<string>())

	useEffect(() => {
		if (!isConnected) return
		if (syncingFromGoogleRef.current) return

		const calendarEntities = Object.values(entities).filter(
			(e) => e.type === 'calendar_event' && !e.id.startsWith('pending-'),
		)

		for (const entity of calendarEntities) {
			if (inFlightRef.current.has(entity.id)) continue

			const state = entity.state as CalendarEventState
			const gcalId = state.gcal_id

			// Case 3: Archived entity with gcal_id → DELETE from Google
			if (entity.archived && gcalId) {
				inFlightRef.current.add(entity.id)
				fetch(`/api/google-calendar/events/${encodeURIComponent(gcalId)}`, {
					method: 'DELETE',
				})
					.then((res) => {
						if (!res.ok && res.status !== 404 && res.status !== 410) {
							throw new Error(`DELETE failed (${res.status})`)
						}
						syncedSnapshotRef.current.delete(entity.id)
					})
					.catch((err) => {
						console.error('[calendarSync] Failed to delete Google event:', err)
					})
					.finally(() => {
						inFlightRef.current.delete(entity.id)
					})
				continue
			}

			// Skip archived entities without gcal_id
			if (entity.archived) continue

			// Case 2: No gcal_id → POST to Google, then set gcal_id on entity
			if (!gcalId) {
				// Only sync agent-created events automatically
				if (entity.created_by !== 'agent') continue

				inFlightRef.current.add(entity.id)
				const attendees = state.attendees as unknown

				const body: Record<string, unknown> = {
					title: state.title,
					start: state.start,
					end: state.end,
					timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				}
				if (Array.isArray(attendees) && attendees.length > 0) {
					body.attendees = attendees.map((a: unknown) => (typeof a === 'string' ? { email: a } : a))
				}

				fetch('/api/google-calendar/events', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				})
					.then(async (res) => {
						if (!res.ok) throw new Error(`POST failed (${res.status})`)
						const created = (await res.json()) as { id: string }
						// Set gcal_id on the entity so future edits sync via PATCH
						const current = useEntityStore.getState().entities[entity.id]
						if (current) {
							const updatedState = { ...current.state, gcal_id: created.id }
							upsert({
								...current,
								state: updatedState,
								updated_at: new Date().toISOString(),
							})
							syncedSnapshotRef.current.set(
								entity.id,
								snapshotKey(updatedState as CalendarEventState),
							)
						}
					})
					.catch((err) => {
						console.error('[calendarSync] Failed to create Google event:', err)
						// Allow retry after delay
						setTimeout(() => inFlightRef.current.delete(entity.id), 30_000)
						return
					})
					.finally(() => {
						inFlightRef.current.delete(entity.id)
					})
				continue
			}

			// Case 1: Has gcal_id + state changed → PATCH Google
			const currentSnapshot = snapshotKey(state)
			const lastSnapshot = syncedSnapshotRef.current.get(entity.id)

			if (lastSnapshot === undefined) {
				// First time seeing this entity — record snapshot, don't sync
				// (it was either just fetched from Google or just had gcal_id set)
				syncedSnapshotRef.current.set(entity.id, currentSnapshot)
				continue
			}

			if (currentSnapshot === lastSnapshot) continue // No change

			inFlightRef.current.add(entity.id)
			const payload: Record<string, unknown> = {
				title: state.title,
				start: state.start,
				end: state.end,
			}
			if (state.attendees) {
				payload.attendees = state.attendees.map((a) => (typeof a === 'string' ? { email: a } : a))
			}

			fetch(`/api/google-calendar/events/${encodeURIComponent(gcalId)}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})
				.then((res) => {
					if (!res.ok) throw new Error(`PATCH failed (${res.status})`)
					syncedSnapshotRef.current.set(entity.id, currentSnapshot)
				})
				.catch((err) => {
					console.error('[calendarSync] Failed to update Google event:', err)
					// Allow retry after delay
					setTimeout(() => inFlightRef.current.delete(entity.id), 30_000)
					return
				})
				.finally(() => {
					inFlightRef.current.delete(entity.id)
				})
		}
	}, [entities, isConnected, syncingFromGoogleRef, upsert])
}

/** Deterministic string key for change detection — only includes Google-synced fields. */
function snapshotKey(state: CalendarEventState): string {
	return JSON.stringify({
		title: state.title,
		start: state.start,
		end: state.end,
		attendees: state.attendees ?? [],
	})
}
