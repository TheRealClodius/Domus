import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DayView from '@/apps/calendar/DayView'
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

describe('DayView', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders time gutter with hour labels', () => {
		render(
			<DayView
				selectedDate="2026-02-16"
				events={[]}
				onClickSlot={vi.fn()}
				onClickEvent={vi.fn()}
			/>,
		)
		expect(screen.getByText('9 AM')).toBeDefined()
		expect(screen.getByText('12 PM')).toBeDefined()
		expect(screen.getByText('5 PM')).toBeDefined()
	})

	it('renders event blocks with title and time', () => {
		const events = [
			makeEvent({
				id: 'e1',
				state: {
					title: 'Design review',
					start: '2026-02-16T14:00:00',
					end: '2026-02-16T15:00:00',
					all_day: false,
				},
			}),
		]
		render(
			<DayView
				selectedDate="2026-02-16"
				events={events}
				onClickSlot={vi.fn()}
				onClickEvent={vi.fn()}
			/>,
		)
		expect(screen.getByText('Design review')).toBeDefined()
		// "2 PM" appears in both gutter and event — verify at least one is inside the event button
		const matches = screen.getAllByText('2 PM')
		expect(matches.length).toBeGreaterThanOrEqual(2)
	})

	it('calls onClickSlot when an empty time slot is clicked', async () => {
		const onClickSlot = vi.fn()
		const user = userEvent.setup()
		render(
			<DayView
				selectedDate="2026-02-16"
				events={[]}
				onClickSlot={onClickSlot}
				onClickEvent={vi.fn()}
			/>,
		)
		const slot = screen.getByLabelText('2026-02-16 10 AM')
		await user.click(slot)
		expect(onClickSlot).toHaveBeenCalledWith('2026-02-16T10:00:00')
	})

	it('calls onClickEvent when an event block is clicked', async () => {
		const onClickEvent = vi.fn()
		const user = userEvent.setup()
		const events = [
			makeEvent({
				id: 'e1',
				state: {
					title: 'Lunch',
					start: '2026-02-16T12:00:00',
					end: '2026-02-16T13:00:00',
					all_day: false,
				},
			}),
		]
		render(
			<DayView
				selectedDate="2026-02-16"
				events={events}
				onClickSlot={vi.fn()}
				onClickEvent={onClickEvent}
			/>,
		)
		await user.click(screen.getByText('Lunch'))
		expect(onClickEvent).toHaveBeenCalledWith('e1')
	})

	it('renders current time line when viewing today', () => {
		const now = new Date()
		const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
		const { container } = render(
			<DayView selectedDate={today} events={[]} onClickSlot={vi.fn()} onClickEvent={vi.fn()} />,
		)
		expect(container.querySelector('[data-testid="current-time-line"]')).not.toBeNull()
	})

	it('does not render current time line on other days', () => {
		const { container } = render(
			<DayView
				selectedDate="2025-01-01"
				events={[]}
				onClickSlot={vi.fn()}
				onClickEvent={vi.fn()}
			/>,
		)
		expect(container.querySelector('[data-testid="current-time-line"]')).toBeNull()
	})
})
