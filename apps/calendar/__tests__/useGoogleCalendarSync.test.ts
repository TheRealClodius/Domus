import { cleanup, renderHook } from '@testing-library/react'
import { createRef, type MutableRefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { GoogleCalendarEventRaw } from '@/apps/calendar/googleCalendarTypes'
import type { CalendarEventState } from '@/apps/calendar/types'
import { useGoogleCalendarSync } from '@/apps/calendar/useGoogleCalendarSync'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

function makeCalendarAppEntity(): Entity {
	return {
		id: 'cal-app-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'calendar',
		presentation: 'window',
		position: { x: 0, y: 0, locked: false },
		size: { width: 600, height: 400 },
		z_index: 0,
		content: '',
		state: { view: 'month', selected_date: '2026-02-17' },
		summary: 'Calendar',
		created_by: 'user',
		archived: false,
		created_at: '2026-02-17T00:00:00Z',
		updated_at: '2026-02-17T00:00:00Z',
	}
}

function makeGoogleEvent(overrides: Partial<GoogleCalendarEventRaw> = {}): GoogleCalendarEventRaw {
	return {
		id: 'google-evt-1',
		summary: 'Team standup',
		start: { dateTime: '2026-02-17T09:00:00-05:00' },
		end: { dateTime: '2026-02-17T09:30:00-05:00' },
		...overrides,
	}
}

function makeSyncingRef(): MutableRefObject<boolean> {
	const ref = createRef<boolean>() as MutableRefObject<boolean>
	ref.current = false
	return ref
}

const range = { start: '2026-01-01T00:00:00Z', end: '2026-12-31T23:59:59Z' }

describe('useGoogleCalendarSync', () => {
	const originalFetch = globalThis.fetch
	let mockFetch: Mock

	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers({ shouldAdvanceTime: true })
		useEntityStore.setState({ entities: {} })
	})

	afterEach(() => {
		cleanup()
		vi.useRealTimers()
		globalThis.fetch = originalFetch
	})

	it('creates entities from Google events', async () => {
		const googleEvents = [makeGoogleEvent()]
		mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify(googleEvents), { status: 200 }))
		globalThis.fetch = mockFetch

		const calApp = makeCalendarAppEntity()
		useEntityStore.setState({ entities: { [calApp.id]: calApp } })

		renderHook(() => useGoogleCalendarSync(range, true, calApp.id, makeSyncingRef()))

		await vi.waitFor(() => {
			const entities = Object.values(useEntityStore.getState().entities)
			const calEvents = entities.filter((e) => e.type === 'calendar_event')
			expect(calEvents).toHaveLength(1)
		})

		const entities = Object.values(useEntityStore.getState().entities)
		const calEvent = entities.find((e) => e.type === 'calendar_event')
		expect(calEvent).toBeDefined()
		const state = calEvent?.state as CalendarEventState
		expect(state.gcal_id).toBe('google-evt-1')
		expect(state.title).toBe('Team standup')
		expect(state.start).toBe('2026-02-17T09:00:00-05:00')
		expect(state.end).toBe('2026-02-17T09:30:00-05:00')
		expect(state.all_day).toBe(false)
		expect(calEvent?.presentation).toBe('hidden')
		expect(calEvent?.space_id).toBe('space-1')
	})

	it('maps all-day events correctly', async () => {
		const googleEvents = [
			makeGoogleEvent({
				id: 'day1',
				summary: 'Holiday',
				start: { date: '2026-02-20' },
				end: { date: '2026-02-21' },
			}),
		]
		mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify(googleEvents), { status: 200 }))
		globalThis.fetch = mockFetch

		const calApp = makeCalendarAppEntity()
		useEntityStore.setState({ entities: { [calApp.id]: calApp } })

		renderHook(() => useGoogleCalendarSync(range, true, calApp.id, makeSyncingRef()))

		await vi.waitFor(() => {
			const entities = Object.values(useEntityStore.getState().entities)
			expect(entities.filter((e) => e.type === 'calendar_event')).toHaveLength(1)
		})

		const calEvent = Object.values(useEntityStore.getState().entities).find(
			(e) => e.type === 'calendar_event',
		)
		expect(calEvent).toBeDefined()
		const state = calEvent?.state as CalendarEventState
		expect(state.all_day).toBe(true)
		expect(state.start).toBe('2026-02-20T00:00:00')
		expect(state.end).toBe('2026-02-21T00:00:00')
	})

	it('defaults to "(No title)" when summary is missing', async () => {
		const googleEvents = [makeGoogleEvent({ summary: undefined })]
		mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify(googleEvents), { status: 200 }))
		globalThis.fetch = mockFetch

		const calApp = makeCalendarAppEntity()
		useEntityStore.setState({ entities: { [calApp.id]: calApp } })

		renderHook(() => useGoogleCalendarSync(range, true, calApp.id, makeSyncingRef()))

		await vi.waitFor(() => {
			const calEvent = Object.values(useEntityStore.getState().entities).find(
				(e) => e.type === 'calendar_event',
			)
			expect(calEvent).toBeDefined()
			expect((calEvent?.state as CalendarEventState).title).toBe('(No title)')
		})
	})

	it('updates existing entity when Google data changes', async () => {
		const calApp = makeCalendarAppEntity()
		const existingEntity: Entity = {
			id: 'existing-uuid',
			space_id: 'space-1',
			user_id: 'user-1',
			type: 'calendar_event',
			presentation: 'hidden',
			position: { x: 0, y: 0, locked: false },
			size: { width: 0, height: 0 },
			z_index: 0,
			content: '',
			state: {
				title: 'Old title',
				start: '2026-02-17T09:00:00-05:00',
				end: '2026-02-17T09:30:00-05:00',
				all_day: false,
				gcal_id: 'google-evt-1',
				color: 'cool',
			},
			summary: 'Old title',
			created_by: 'user',
			archived: false,
			created_at: '2026-02-17T00:00:00Z',
			updated_at: '2026-02-17T00:00:00Z',
		}
		useEntityStore.setState({
			entities: { [calApp.id]: calApp, [existingEntity.id]: existingEntity },
		})

		const googleEvents = [makeGoogleEvent({ summary: 'New title' })]
		mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify(googleEvents), { status: 200 }))
		globalThis.fetch = mockFetch

		renderHook(() => useGoogleCalendarSync(range, true, calApp.id, makeSyncingRef()))

		await vi.waitFor(() => {
			const entity = useEntityStore.getState().entities['existing-uuid']
			expect((entity?.state as CalendarEventState).title).toBe('New title')
		})

		// Should not create a duplicate
		const calEvents = Object.values(useEntityStore.getState().entities).filter(
			(e) => e.type === 'calendar_event',
		)
		expect(calEvents).toHaveLength(1)
	})

	it('skips update when entity state matches Google data', async () => {
		const calApp = makeCalendarAppEntity()
		const existingEntity: Entity = {
			id: 'existing-uuid',
			space_id: 'space-1',
			user_id: 'user-1',
			type: 'calendar_event',
			presentation: 'hidden',
			position: { x: 0, y: 0, locked: false },
			size: { width: 0, height: 0 },
			z_index: 0,
			content: '',
			state: {
				title: 'Team standup',
				start: '2026-02-17T09:00:00-05:00',
				end: '2026-02-17T09:30:00-05:00',
				all_day: false,
				gcal_id: 'google-evt-1',
				color: 'cool',
			},
			summary: 'Team standup',
			created_by: 'user',
			archived: false,
			created_at: '2026-02-17T00:00:00Z',
			updated_at: '2026-02-17T00:00:00Z',
		}
		useEntityStore.setState({
			entities: { [calApp.id]: calApp, [existingEntity.id]: existingEntity },
		})

		const googleEvents = [makeGoogleEvent()]
		mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify(googleEvents), { status: 200 }))
		globalThis.fetch = mockFetch

		const upsertSpy = vi.spyOn(useEntityStore.getState(), 'upsert')
		renderHook(() => useGoogleCalendarSync(range, true, calApp.id, makeSyncingRef()))

		// Wait for fetch to complete
		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalled()
		})

		// Allow effects to settle
		await vi.advanceTimersByTimeAsync(100)

		// upsert should NOT have been called for the calendar event (state unchanged)
		// It may be called for other things, so check specific calls
		const calEventUpserts = upsertSpy.mock.calls.filter(
			(call) => (call[0] as Entity).type === 'calendar_event',
		)
		expect(calEventUpserts).toHaveLength(0)
		upsertSpy.mockRestore()
	})

	it('archives entity when Google event is deleted', async () => {
		const calApp = makeCalendarAppEntity()
		const existingEntity: Entity = {
			id: 'existing-uuid',
			space_id: 'space-1',
			user_id: 'user-1',
			type: 'calendar_event',
			presentation: 'hidden',
			position: { x: 0, y: 0, locked: false },
			size: { width: 0, height: 0 },
			z_index: 0,
			content: '',
			state: {
				title: 'Deleted meeting',
				start: '2026-02-17T09:00:00Z',
				end: '2026-02-17T10:00:00Z',
				all_day: false,
				gcal_id: 'deleted-on-google',
			},
			summary: 'Deleted meeting',
			created_by: 'user',
			archived: false,
			created_at: '2026-02-17T00:00:00Z',
			updated_at: '2026-02-17T00:00:00Z',
		}
		useEntityStore.setState({
			entities: { [calApp.id]: calApp, [existingEntity.id]: existingEntity },
		})

		// Google returns empty list — event was deleted
		mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
		globalThis.fetch = mockFetch

		renderHook(() => useGoogleCalendarSync(range, true, calApp.id, makeSyncingRef()))

		await vi.waitFor(() => {
			expect(useEntityStore.getState().entities['existing-uuid']?.archived).toBe(true)
		})
	})

	it('does not fetch when disabled', () => {
		mockFetch = vi.fn()
		globalThis.fetch = mockFetch

		const calApp = makeCalendarAppEntity()
		useEntityStore.setState({ entities: { [calApp.id]: calApp } })

		renderHook(() => useGoogleCalendarSync(range, false, calApp.id, makeSyncingRef()))

		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('sets syncing ref during upserts', async () => {
		const googleEvents = [makeGoogleEvent()]
		mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify(googleEvents), { status: 200 }))
		globalThis.fetch = mockFetch

		const calApp = makeCalendarAppEntity()
		useEntityStore.setState({ entities: { [calApp.id]: calApp } })

		const syncingRef = makeSyncingRef()
		renderHook(() => useGoogleCalendarSync(range, true, calApp.id, syncingRef))

		// After fetch resolves, ref should eventually be set back to false
		await vi.waitFor(() => {
			const calEvents = Object.values(useEntityStore.getState().entities).filter(
				(e) => e.type === 'calendar_event',
			)
			expect(calEvents).toHaveLength(1)
		})

		// Wait for setTimeout(0) to clear the flag
		await vi.advanceTimersByTimeAsync(10)
		expect(syncingRef.current).toBe(false)
	})

	it('exposes error on API failure', async () => {
		mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ error: 'Token revoked' }), { status: 401 }))
		globalThis.fetch = mockFetch

		const calApp = makeCalendarAppEntity()
		useEntityStore.setState({ entities: { [calApp.id]: calApp } })

		const { result } = renderHook(() =>
			useGoogleCalendarSync(range, true, calApp.id, makeSyncingRef()),
		)

		await vi.waitFor(() => {
			expect(result.current.error).toBe('disconnected')
		})
	})
})
