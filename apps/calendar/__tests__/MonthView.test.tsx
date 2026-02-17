import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MonthView from '@/apps/calendar/MonthView'
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

describe('MonthView', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders day headers for each month', () => {
		render(<MonthView year={2026} selectedDate="2026-02-17" events={[]} onSelectDay={vi.fn()} />)
		const headers = screen.getAllByRole('columnheader')
		// 7 day headers × 12 months = 84
		expect(headers).toHaveLength(84)
		expect(headers[0].textContent).toBe('Mon')
		expect(headers[6].textContent).toBe('Sun')
	})

	it('renders 365 day cells (only current-month days get gridcell role)', () => {
		render(<MonthView year={2026} selectedDate="2026-02-17" events={[]} onSelectDay={vi.fn()} />)
		const cells = screen.getAllByRole('gridcell')
		expect(cells).toHaveLength(365)
	})

	it('renders all 12 month labels', () => {
		render(<MonthView year={2026} selectedDate="2026-01-01" events={[]} onSelectDay={vi.fn()} />)
		const months = [
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December',
		]
		for (const month of months) {
			expect(screen.getByText(month)).toBeDefined()
		}
	})

	it('shows event dots for days with events', () => {
		const events = [
			makeEvent({
				id: 'e1',
				state: {
					title: 'Meeting',
					start: '2026-02-17T09:00:00',
					end: '2026-02-17T10:00:00',
					all_day: false,
				},
			}),
		]
		const { container } = render(
			<MonthView year={2026} selectedDate="2026-02-17" events={events} onSelectDay={vi.fn()} />,
		)
		// Should have at least one dot (6px circle)
		const dots = container.querySelectorAll('.rounded-full.size-1\\.5')
		expect(dots.length).toBeGreaterThanOrEqual(1)
	})

	it('shows overflow count when more than 3 events on a day', () => {
		const events = [
			makeEvent({
				id: 'e1',
				state: {
					title: 'A',
					start: '2026-02-17T09:00:00',
					end: '2026-02-17T10:00:00',
					all_day: false,
				},
			}),
			makeEvent({
				id: 'e2',
				state: {
					title: 'B',
					start: '2026-02-17T10:00:00',
					end: '2026-02-17T11:00:00',
					all_day: false,
				},
			}),
			makeEvent({
				id: 'e3',
				state: {
					title: 'C',
					start: '2026-02-17T11:00:00',
					end: '2026-02-17T12:00:00',
					all_day: false,
				},
			}),
			makeEvent({
				id: 'e4',
				state: {
					title: 'D',
					start: '2026-02-17T12:00:00',
					end: '2026-02-17T13:00:00',
					all_day: false,
				},
			}),
		]
		render(
			<MonthView year={2026} selectedDate="2026-02-17" events={events} onSelectDay={vi.fn()} />,
		)
		expect(screen.getByText('+1')).toBeDefined()
	})

	it('calls onSelectDay when a day is clicked', async () => {
		const onSelectDay = vi.fn()
		const user = userEvent.setup()
		render(
			<MonthView year={2026} selectedDate="2026-02-17" events={[]} onSelectDay={onSelectDay} />,
		)

		// Use aria-label to find a specific day across all 12 months
		const day17 = screen.getByLabelText('February 17, 2026')
		await user.click(day17)
		expect(onSelectDay).toHaveBeenCalledWith('2026-02-17')
	})
})
