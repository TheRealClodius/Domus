import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EventPopover from '@/apps/calendar/EventPopover'

const defaultProps = {
	startDateTime: '2026-02-17T09:00:00',
	position: { x: 100, y: 100 },
	onSave: vi.fn(),
	onDismiss: vi.fn(),
}

describe('EventPopover', () => {
	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
	})

	it('renders with title input and time range', () => {
		render(<EventPopover {...defaultProps} />)
		expect(screen.getByPlaceholderText('Event title')).toBeDefined()
		expect(screen.getByText(/9 AM/)).toBeDefined()
		expect(screen.getByText(/10 AM/)).toBeDefined()
		expect(screen.getByRole('button', { name: 'Save' })).toBeDefined()
	})

	it('auto-focuses the title input', () => {
		render(<EventPopover {...defaultProps} />)
		expect(document.activeElement).toBe(screen.getByPlaceholderText('Event title'))
	})

	it('calls onSave with title and times when Save is clicked', async () => {
		const onSave = vi.fn()
		const user = userEvent.setup()
		render(<EventPopover {...defaultProps} onSave={onSave} />)

		await user.type(screen.getByPlaceholderText('Event title'), 'Team standup')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		expect(onSave).toHaveBeenCalledWith({
			title: 'Team standup',
			start: new Date('2026-02-17T09:00:00').toISOString(),
			end: new Date('2026-02-17T10:00:00').toISOString(),
		})
	})

	it('calls onSave on Enter key', async () => {
		const onSave = vi.fn()
		const user = userEvent.setup()
		render(<EventPopover {...defaultProps} onSave={onSave} />)

		await user.type(screen.getByPlaceholderText('Event title'), 'Quick sync')
		await user.keyboard('{Enter}')

		expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Quick sync' }))
	})

	it('shows error when saving with empty title', async () => {
		const onSave = vi.fn()
		const user = userEvent.setup()
		render(<EventPopover {...defaultProps} onSave={onSave} />)

		await user.click(screen.getByRole('button', { name: 'Save' }))

		expect(screen.getByText('Title is required')).toBeDefined()
		expect(onSave).not.toHaveBeenCalled()
	})

	it('calls onDismiss on Escape key', async () => {
		const onDismiss = vi.fn()
		const user = userEvent.setup()
		render(<EventPopover {...defaultProps} onDismiss={onDismiss} />)

		await user.keyboard('{Escape}')
		expect(onDismiss).toHaveBeenCalled()
	})
})
