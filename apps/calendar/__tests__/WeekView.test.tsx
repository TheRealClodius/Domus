import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'
import WeekView from '@/apps/calendar/WeekView'
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

describe('WeekView', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders 7 day column headers', () => {
		render(
			<WeekView
				selectedDate="2026-02-16"
				events={[]}
				onClickSlot={vi.fn()}
				onClickEvent={vi.fn()}
			/>,
		)
		expect(screen.getByText('Mon')).toBeDefined()
		expect(screen.getByText('Sun')).toBeDefined()
	})

	it('renders time gutter with hour labels', () => {
		render(
			<WeekView
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

	it('renders event blocks with title', () => {
		const events = [
			makeEvent({
				id: 'e1',
				state: {
					title: 'Team standup',
					start: '2026-02-16T09:00:00',
					end: '2026-02-16T09:30:00',
					all_day: false,
				},
			}),
		]
		render(
			<WeekView
				selectedDate="2026-02-16"
				events={events}
				onClickSlot={vi.fn()}
				onClickEvent={vi.fn()}
			/>,
		)
		expect(screen.getByText('Team standup')).toBeDefined()
	})

	it('calls onClickSlot when an empty time slot is clicked', async () => {
		const onClickSlot = vi.fn()
		const user = userEvent.setup()
		render(
			<WeekView
				selectedDate="2026-02-16"
				events={[]}
				onClickSlot={onClickSlot}
				onClickEvent={vi.fn()}
			/>,
		)
		// Click the 9 AM slot on the first day (Mon Feb 16)
		const slot = screen.getByLabelText('2026-02-16 9 AM')
		await user.click(slot)
		expect(onClickSlot).toHaveBeenCalledWith('2026-02-16T09:00:00')
	})

	it('calls onClickEvent when an event block is clicked', async () => {
		const onClickEvent = vi.fn()
		const user = userEvent.setup()
		const events = [
			makeEvent({
				id: 'e1',
				state: {
					title: 'Meeting',
					start: '2026-02-16T10:00:00',
					end: '2026-02-16T11:00:00',
					all_day: false,
				},
			}),
		]
		render(
			<WeekView
				selectedDate="2026-02-16"
				events={events}
				onClickSlot={vi.fn()}
				onClickEvent={onClickEvent}
			/>,
		)
		await user.click(screen.getByText('Meeting'))
		expect(onClickEvent).toHaveBeenCalledWith('e1')
	})

	it('renders current time line on today column', () => {
		const now = new Date()
		const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
		const { container } = render(
			<WeekView selectedDate={today} events={[]} onClickSlot={vi.fn()} onClickEvent={vi.fn()} />,
		)
		expect(container.querySelector('[data-testid="current-time-line"]')).not.toBeNull()
	})
})
