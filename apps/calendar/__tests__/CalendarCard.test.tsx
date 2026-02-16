import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CalendarCard from '@/apps/calendar/CalendarCard'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

function makeEvent(overrides: Partial<Entity> & { state: Record<string, unknown> }): Entity {
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

function futureDateTime(hoursFromNow: number): string {
	const d = new Date()
	d.setHours(d.getHours() + hoursFromNow)
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	const h = String(d.getHours()).padStart(2, '0')
	const min = String(d.getMinutes()).padStart(2, '0')
	return `${y}-${m}-${day}T${h}:${min}:00`
}

describe('CalendarCard', () => {
	afterEach(() => {
		useEntityStore.setState({ entities: {} })
		cleanup()
	})

	it('shows empty state when no events exist', () => {
		render(<CalendarCard />)
		expect(screen.getByText('No upcoming events')).toBeDefined()
		expect(screen.getByTestId('calendar-card')).toBeDefined()
	})

	it('shows up to 3 upcoming events', () => {
		const entities: Record<string, Entity> = {}
		for (let i = 1; i <= 4; i++) {
			const start = futureDateTime(i)
			const end = futureDateTime(i + 1)
			entities[`e${i}`] = makeEvent({
				id: `e${i}`,
				state: { title: `Event ${i}`, start, end, all_day: false },
			})
		}
		useEntityStore.setState({ entities })

		render(<CalendarCard />)
		expect(screen.getByText('Event 1')).toBeDefined()
		expect(screen.getByText('Event 2')).toBeDefined()
		expect(screen.getByText('Event 3')).toBeDefined()
		expect(screen.queryByText('Event 4')).toBeNull()
	})

	it('does not show past events', () => {
		const pastStart = '2020-01-01T09:00:00'
		const pastEnd = '2020-01-01T10:00:00'
		const futureStart = futureDateTime(2)
		const futureEnd = futureDateTime(3)

		useEntityStore.setState({
			entities: {
				past: makeEvent({
					id: 'past',
					state: { title: 'Past event', start: pastStart, end: pastEnd, all_day: false },
				}),
				future: makeEvent({
					id: 'future',
					state: { title: 'Future event', start: futureStart, end: futureEnd, all_day: false },
				}),
			},
		})

		render(<CalendarCard />)
		expect(screen.queryByText('Past event')).toBeNull()
		expect(screen.getByText('Future event')).toBeDefined()
	})

	it('shows "All day" for all-day events', () => {
		const start = futureDateTime(2)
		const end = futureDateTime(26)
		useEntityStore.setState({
			entities: {
				ad: makeEvent({
					id: 'ad',
					state: { title: 'Conference', start, end, all_day: true },
				}),
			},
		})

		render(<CalendarCard />)
		expect(screen.getByText('All day')).toBeDefined()
		expect(screen.getByText('Conference')).toBeDefined()
	})
})
