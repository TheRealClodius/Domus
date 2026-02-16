import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCalendarEvents } from '@/apps/calendar/useCalendarEvents'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

function makeCalendarEvent(
	overrides: Partial<Entity> & { state: Record<string, unknown> },
): Entity {
	return {
		id: 'event-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'calendar_event',
		presentation: 'hidden',
		position: { x: 0, y: 0, locked: false },
		size: { width: 0, height: 0 },
		z_index: 0,
		content: '',
		summary: '',
		created_by: 'user',
		archived: false,
		created_at: '2026-02-16T00:00:00Z',
		updated_at: '2026-02-16T00:00:00Z',
		...overrides,
	}
}

describe('useCalendarEvents', () => {
	beforeEach(() => {
		useEntityStore.setState({ entities: {} })
	})

	it('returns empty array when no entities exist', () => {
		const { result } = renderHook(() =>
			useCalendarEvents({ start: '2026-02-01T00:00:00', end: '2026-03-01T00:00:00' }),
		)
		expect(result.current).toEqual([])
	})

	it('returns calendar_event entities within the date range', () => {
		useEntityStore.getState().upsert(
			makeCalendarEvent({
				id: 'e1',
				state: {
					title: 'Standup',
					start: '2026-02-17T09:00:00',
					end: '2026-02-17T09:30:00',
					all_day: false,
				},
			}),
		)

		const { result } = renderHook(() =>
			useCalendarEvents({ start: '2026-02-01T00:00:00', end: '2026-03-01T00:00:00' }),
		)
		expect(result.current).toHaveLength(1)
		expect(result.current[0].id).toBe('e1')
	})

	it('excludes events outside the date range', () => {
		useEntityStore.getState().upsert(
			makeCalendarEvent({
				id: 'e1',
				state: {
					title: 'January meeting',
					start: '2026-01-15T10:00:00',
					end: '2026-01-15T11:00:00',
					all_day: false,
				},
			}),
		)

		const { result } = renderHook(() =>
			useCalendarEvents({ start: '2026-02-01T00:00:00', end: '2026-03-01T00:00:00' }),
		)
		expect(result.current).toHaveLength(0)
	})

	it('excludes archived events', () => {
		useEntityStore.getState().upsert(
			makeCalendarEvent({
				id: 'e1',
				archived: true,
				state: {
					title: 'Deleted event',
					start: '2026-02-17T09:00:00',
					end: '2026-02-17T09:30:00',
					all_day: false,
				},
			}),
		)

		const { result } = renderHook(() =>
			useCalendarEvents({ start: '2026-02-01T00:00:00', end: '2026-03-01T00:00:00' }),
		)
		expect(result.current).toHaveLength(0)
	})

	it('excludes non-calendar_event entities', () => {
		useEntityStore.getState().upsert(
			makeCalendarEvent({
				id: 'e1',
				type: 'note',
				state: {
					title: 'A note',
					start: '2026-02-17T09:00:00',
					end: '2026-02-17T09:30:00',
					all_day: false,
				},
			}),
		)

		const { result } = renderHook(() =>
			useCalendarEvents({ start: '2026-02-01T00:00:00', end: '2026-03-01T00:00:00' }),
		)
		expect(result.current).toHaveLength(0)
	})

	it('sorts events by start time', () => {
		useEntityStore.getState().upsert(
			makeCalendarEvent({
				id: 'late',
				state: {
					title: 'Late',
					start: '2026-02-17T15:00:00',
					end: '2026-02-17T16:00:00',
					all_day: false,
				},
			}),
		)
		useEntityStore.getState().upsert(
			makeCalendarEvent({
				id: 'early',
				state: {
					title: 'Early',
					start: '2026-02-17T08:00:00',
					end: '2026-02-17T09:00:00',
					all_day: false,
				},
			}),
		)

		const { result } = renderHook(() =>
			useCalendarEvents({ start: '2026-02-01T00:00:00', end: '2026-03-01T00:00:00' }),
		)
		expect(result.current[0].id).toBe('early')
		expect(result.current[1].id).toBe('late')
	})

	it('includes events that overlap the range boundary', () => {
		// Event starts before range but ends within it
		useEntityStore.getState().upsert(
			makeCalendarEvent({
				id: 'overlap',
				state: {
					title: 'Overlap',
					start: '2026-01-31T23:00:00',
					end: '2026-02-01T01:00:00',
					all_day: false,
				},
			}),
		)

		const { result } = renderHook(() =>
			useCalendarEvents({ start: '2026-02-01T00:00:00', end: '2026-03-01T00:00:00' }),
		)
		expect(result.current).toHaveLength(1)
	})
})
