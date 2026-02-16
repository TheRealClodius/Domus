import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AgendaView from '@/apps/calendar/AgendaView'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import type { Entity } from '@/lib/types'

function makeEvent(overrides: Partial<Entity> & { state: Record<string, unknown> }): CalendarEvent {
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
	} as CalendarEvent
}

describe('AgendaView', () => {
	afterEach(() => {
		cleanup()
	})

	it('shows empty state when no events', () => {
		render(<AgendaView selectedDate="2026-02-16" events={[]} onClickEvent={vi.fn()} />)
		expect(screen.getByText('No upcoming events')).toBeDefined()
	})

	it('groups events by day with date headers', () => {
		const events = [
			makeEvent({
				id: 'e1',
				state: {
					title: 'Monday meeting',
					start: '2026-02-16T09:00:00',
					end: '2026-02-16T10:00:00',
					all_day: false,
				},
			}),
			makeEvent({
				id: 'e2',
				state: {
					title: 'Tuesday standup',
					start: '2026-02-17T09:00:00',
					end: '2026-02-17T09:30:00',
					all_day: false,
				},
			}),
		]
		render(<AgendaView selectedDate="2026-02-16" events={events} onClickEvent={vi.fn()} />)
		expect(screen.getByText('Monday, February 16')).toBeDefined()
		expect(screen.getByText('Tuesday, February 17')).toBeDefined()
		expect(screen.getByText('Monday meeting')).toBeDefined()
		expect(screen.getByText('Tuesday standup')).toBeDefined()
	})

	it('shows "All day" for all-day events instead of time', () => {
		const events = [
			makeEvent({
				id: 'e1',
				state: {
					title: 'Holiday',
					start: '2026-02-16T00:00:00',
					end: '2026-02-17T00:00:00',
					all_day: true,
				},
			}),
		]
		render(<AgendaView selectedDate="2026-02-16" events={events} onClickEvent={vi.fn()} />)
		expect(screen.getByText('All day')).toBeDefined()
	})

	it('skips empty days', () => {
		const events = [
			makeEvent({
				id: 'e1',
				state: {
					title: 'Wednesday event',
					start: '2026-02-18T10:00:00',
					end: '2026-02-18T11:00:00',
					all_day: false,
				},
			}),
		]
		render(<AgendaView selectedDate="2026-02-16" events={events} onClickEvent={vi.fn()} />)
		// Feb 16 and 17 have no events — should not appear as headers
		expect(screen.queryByText('Monday, February 16')).toBeNull()
		expect(screen.queryByText('Tuesday, February 17')).toBeNull()
		expect(screen.getByText('Wednesday, February 18')).toBeDefined()
	})

	it('calls onClickEvent when an event row is clicked', async () => {
		const onClickEvent = vi.fn()
		const user = userEvent.setup()
		const events = [
			makeEvent({
				id: 'e1',
				state: {
					title: 'Clickable event',
					start: '2026-02-16T09:00:00',
					end: '2026-02-16T10:00:00',
					all_day: false,
				},
			}),
		]
		render(<AgendaView selectedDate="2026-02-16" events={events} onClickEvent={onClickEvent} />)
		await user.click(screen.getByText('Clickable event'))
		expect(onClickEvent).toHaveBeenCalledWith('e1')
	})
})
