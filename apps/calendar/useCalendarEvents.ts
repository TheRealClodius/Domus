import { useMemo } from 'react'
import type { CalendarEventState } from '@/apps/calendar/types'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

export type CalendarEvent = Entity & { state: CalendarEventState }

/**
 * Returns calendar_event entities within a date range, sorted by start time.
 * Filters out archived entities.
 */
export function useCalendarEvents(range: { start: string; end: string }): CalendarEvent[] {
	const entities = useEntityStore((s) => s.entities)

	return useMemo(() => {
		const rangeStart = range.start
		const rangeEnd = range.end

		return (Object.values(entities) as CalendarEvent[])
			.filter((e) => {
				if (e.type !== 'calendar_event' || e.archived) return false
				const eventState = e.state
				if (!eventState?.start || !eventState?.end) return false
				// Event overlaps range if it starts before range end AND ends after range start
				return eventState.start < rangeEnd && eventState.end > rangeStart
			})
			.sort((a, b) => a.state.start.localeCompare(b.state.start))
	}, [entities, range.start, range.end])
}
