import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EventDetail from '@/apps/calendar/EventDetail'
import type { CalendarEvent } from '@/apps/calendar/useCalendarEvents'

const googleEvent: CalendarEvent = {
	id: 'gcal-abc123',
	space_id: '',
	user_id: '',
	type: 'calendar_event',
	presentation: 'hidden',
	position: { x: 0, y: 0, locked: false },
	size: { width: 0, height: 0 },
	z_index: 0,
	content: '',
	summary: 'Google meeting',
	created_by: 'user',
	archived: false,
	created_at: '2026-02-17T09:00:00',
	updated_at: '2026-02-17T09:00:00',
	state: {
		title: 'Google meeting',
		start: '2026-02-17T09:00:00',
		end: '2026-02-17T10:00:00',
		all_day: false,
		color: 'cool',
	},
	source: 'google',
}

const defaultProps = {
	event: googleEvent,
	position: { x: 100, y: 100 },
	onUpdate: vi.fn(),
	onDelete: vi.fn(),
	onDismiss: vi.fn(),
}

describe('EventDetail — Google events', () => {
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
	})

	it('renders title as plain text (not an input)', () => {
		render(<EventDetail {...defaultProps} />)
		expect(screen.getByText('Google meeting')).toBeDefined()
		expect(screen.queryByLabelText('Event title')).toBeNull()
	})

	it('renders time display', () => {
		render(<EventDetail {...defaultProps} />)
		expect(screen.getByText(/9 AM/)).toBeDefined()
		expect(screen.getByText(/10 AM/)).toBeDefined()
	})

	it('does not render the color picker', () => {
		render(<EventDetail {...defaultProps} />)
		expect(screen.queryByLabelText('Color default')).toBeNull()
		expect(screen.queryByLabelText('Color warm')).toBeNull()
	})

	it('does not render the delete button', () => {
		render(<EventDetail {...defaultProps} />)
		expect(screen.queryByRole('button', { name: 'Delete event' })).toBeNull()
	})

	it('shows "Google Calendar" label', () => {
		render(<EventDetail {...defaultProps} />)
		expect(screen.getByText('Google Calendar')).toBeDefined()
	})
})
