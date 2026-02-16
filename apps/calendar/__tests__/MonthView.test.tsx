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

	it('renders day headers Mon–Sun', () => {
		render(<MonthView year={2026} month={1} events={[]} onSelectDay={vi.fn()} />)
		expect(screen.getByText('Mon')).toBeDefined()
		expect(screen.getByText('Tue')).toBeDefined()
		expect(screen.getByText('Wed')).toBeDefined()
		expect(screen.getByText('Thu')).toBeDefined()
		expect(screen.getByText('Fri')).toBeDefined()
		expect(screen.getByText('Sat')).toBeDefined()
		expect(screen.getByText('Sun')).toBeDefined()
	})

	it('renders 42 day cells (6 weeks)', () => {
		render(<MonthView year={2026} month={1} events={[]} onSelectDay={vi.fn()} />)
		const buttons = screen.getAllByRole('button')
		expect(buttons).toHaveLength(42)
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
			<MonthView year={2026} month={1} events={events} onSelectDay={vi.fn()} />,
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
		render(<MonthView year={2026} month={1} events={events} onSelectDay={vi.fn()} />)
		expect(screen.getByText('+1')).toBeDefined()
	})

	it('calls onSelectDay when a day is clicked', async () => {
		const onSelectDay = vi.fn()
		const user = userEvent.setup()
		render(<MonthView year={2026} month={1} events={[]} onSelectDay={onSelectDay} />)

		// Click the button containing "17"
		const day17 = screen.getByText('17').closest('button') as HTMLButtonElement
		await user.click(day17)
		expect(onSelectDay).toHaveBeenCalledWith('2026-02-17')
	})
})
