import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EventDetail from '@/apps/calendar/EventDetail'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'

const baseEvent: CalendarEvent = {
	id: 'e1',
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
	state: {
		title: 'Team standup',
		start: '2026-02-17T09:00:00',
		end: '2026-02-17T09:30:00',
		all_day: false,
	},
}

const defaultProps = {
	event: baseEvent,
	position: { x: 100, y: 100 },
	onUpdate: vi.fn(),
	onDelete: vi.fn(),
	onDismiss: vi.fn(),
}

describe('EventDetail', () => {
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
	})

	it('renders event title, time, and color picker', () => {
		render(<EventDetail {...defaultProps} />)
		const titleInput = screen.getByLabelText('Event title') as HTMLInputElement
		expect(titleInput.value).toBe('Team standup')
		expect(screen.getByText(/9 AM/)).toBeDefined()
		expect(screen.getByText(/9:30 AM/)).toBeDefined()
		expect(screen.getByLabelText('Color default')).toBeDefined()
		expect(screen.getByLabelText('Color warm')).toBeDefined()
	})

	it('calls onUpdate with new title on blur', async () => {
		const onUpdate = vi.fn()
		const user = userEvent.setup()
		render(<EventDetail {...defaultProps} onUpdate={onUpdate} />)

		const titleInput = screen.getByLabelText('Event title')
		await user.clear(titleInput)
		await user.type(titleInput, 'Renamed meeting')
		await user.tab()

		expect(onUpdate).toHaveBeenCalledWith('e1', { title: 'Renamed meeting' })
	})

	it('does not call onUpdate if title unchanged on blur', async () => {
		const onUpdate = vi.fn()
		const user = userEvent.setup()
		render(<EventDetail {...defaultProps} onUpdate={onUpdate} />)

		const titleInput = screen.getByLabelText('Event title')
		await user.click(titleInput)
		await user.tab()

		expect(onUpdate).not.toHaveBeenCalled()
	})

	it('calls onUpdate with color when a color is clicked', async () => {
		const onUpdate = vi.fn()
		const user = userEvent.setup()
		render(<EventDetail {...defaultProps} onUpdate={onUpdate} />)

		await user.click(screen.getByLabelText('Color warm'))
		expect(onUpdate).toHaveBeenCalledWith('e1', { color: 'warm' })
	})

	it('calls onDelete when delete button is clicked', async () => {
		const onDelete = vi.fn()
		const user = userEvent.setup()
		render(<EventDetail {...defaultProps} onDelete={onDelete} />)

		await user.click(screen.getByRole('button', { name: 'Delete event' }))
		expect(onDelete).toHaveBeenCalledWith('e1')
	})

	it('calls onDismiss on Escape key', async () => {
		const onDismiss = vi.fn()
		const user = userEvent.setup()
		render(<EventDetail {...defaultProps} onDismiss={onDismiss} />)

		await user.keyboard('{Escape}')
		expect(onDismiss).toHaveBeenCalled()
	})

	it('shows "All day" for all-day events', () => {
		const allDayEvent = {
			...baseEvent,
			state: { ...baseEvent.state, all_day: true },
		}
		render(<EventDetail {...defaultProps} event={allDayEvent} />)
		expect(screen.getByText('All day')).toBeDefined()
	})

	it('shows content preview when event has content', () => {
		const eventWithContent = { ...baseEvent, content: 'Meeting notes go here' }
		render(<EventDetail {...defaultProps} event={eventWithContent} />)
		expect(screen.getByText('Meeting notes go here')).toBeDefined()
	})
})
