import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calendarApp } from '@/apps/calendar'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

function makeCalendarEntity(): Entity {
	return {
		id: 'cal-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'calendar',
		presentation: 'window',
		position: { x: 0, y: 0, locked: false },
		size: { width: 600, height: 500 },
		z_index: 1,
		content: '',
		state: { view: 'month', selected_date: '2026-02-16' },
		summary: 'Calendar',
		created_by: 'user',
		archived: false,
		created_at: '2026-02-16T00:00:00Z',
		updated_at: '2026-02-16T00:00:00Z',
	}
}

describe('Calendar app definition', () => {
	it('has correct type, name, and source', () => {
		expect(calendarApp.type).toBe('calendar')
		expect(calendarApp.name).toBe('Calendar')
		expect(calendarApp.source).toBe('built-in')
	})

	it('has correct default presentation and size', () => {
		expect(calendarApp.defaultPresentation).toBe('window')
		expect(calendarApp.defaultSize).toEqual({ width: 600, height: 500 })
	})
})

describe('Calendar reducer', () => {
	const { reduce } = calendarApp

	it('set_view changes the view', () => {
		const state = { view: 'month', selected_date: '2026-02-16' }
		const result = reduce(state, 'set_view', { view: 'week' })
		expect(result).toEqual({ view: 'week', selected_date: '2026-02-16' })
	})

	it('set_date changes the selected date', () => {
		const state = { view: 'month', selected_date: '2026-02-16' }
		const result = reduce(state, 'set_date', { date: '2026-03-01' })
		expect(result).toEqual({ view: 'month', selected_date: '2026-03-01' })
	})

	it('unknown action returns state unchanged', () => {
		const state = { view: 'month', selected_date: '2026-02-16' }
		const result = reduce(state, 'unknown_action', {})
		expect(result).toBe(state)
	})

	it('initializes default state when state is empty', () => {
		const result = reduce({}, 'set_view', { view: 'week' })
		expect(result.view).toBe('week')
		expect(result.selected_date).toBeDefined()
	})
})

describe('Calendar summarize', () => {
	const { summarize } = calendarApp

	it('returns formatted summary with month, year, and view', () => {
		const result = summarize({ view: 'month', selected_date: '2026-02-16' })
		expect(result).toBe('Calendar — February 2026 (month)')
	})

	it('reflects different view in summary', () => {
		const result = summarize({ view: 'week', selected_date: '2026-02-16' })
		expect(result).toBe('Calendar — February 2026 (week)')
	})

	it('reflects different month in summary', () => {
		const result = summarize({ view: 'day', selected_date: '2026-07-04' })
		expect(result).toBe('Calendar — July 2026 (day)')
	})

	it('uses defaults when state is empty', () => {
		const result = summarize({})
		expect(result).toMatch(/^Calendar — \w+ \d{4} \(month\)$/)
	})
})

describe('CalendarApp component', () => {
	beforeEach(() => {
		useEntityStore.setState({ entities: {} })
		useEntityStore.getState().upsert(makeCalendarEntity())
	})

	afterEach(() => {
		cleanup()
	})

	it('renders with month view header', () => {
		const Component = calendarApp.component
		render(
			<Component
				entityId="cal-1"
				state={{ view: 'month', selected_date: '2026-02-16' }}
				dispatch={vi.fn()}
			/>,
		)
		expect(screen.getByText('February 2026')).toBeDefined()
		expect(screen.getByTestId('month-view')).toBeDefined()
	})

	it('renders view switcher pills', () => {
		const Component = calendarApp.component
		render(
			<Component
				entityId="cal-1"
				state={{ view: 'month', selected_date: '2026-02-16' }}
				dispatch={vi.fn()}
			/>,
		)
		expect(screen.getByRole('button', { name: 'M' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'W' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'D' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'A' })).toBeDefined()
	})

	it('switches to week view when W is clicked', async () => {
		const dispatch = vi.fn()
		const user = userEvent.setup()
		const Component = calendarApp.component
		render(
			<Component
				entityId="cal-1"
				state={{ view: 'month', selected_date: '2026-02-16' }}
				dispatch={dispatch}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'W' }))
		expect(screen.getByTestId('week-view')).toBeDefined()
		expect(dispatch).toHaveBeenCalledWith('set_view', { view: 'week' })
	})

	it('switches to day view when D is clicked', async () => {
		const dispatch = vi.fn()
		const user = userEvent.setup()
		const Component = calendarApp.component
		render(
			<Component
				entityId="cal-1"
				state={{ view: 'month', selected_date: '2026-02-16' }}
				dispatch={dispatch}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'D' }))
		expect(screen.getByTestId('day-view')).toBeDefined()
	})

	it('switches to agenda view when A is clicked', async () => {
		const user = userEvent.setup()
		const Component = calendarApp.component
		render(
			<Component
				entityId="cal-1"
				state={{ view: 'month', selected_date: '2026-02-16' }}
				dispatch={vi.fn()}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'A' }))
		expect(screen.getByTestId('agenda-view')).toBeDefined()
	})

	it('navigates to previous month with left chevron', async () => {
		const dispatch = vi.fn()
		const user = userEvent.setup()
		const Component = calendarApp.component
		render(
			<Component
				entityId="cal-1"
				state={{ view: 'month', selected_date: '2026-02-16' }}
				dispatch={dispatch}
			/>,
		)

		await user.click(screen.getByLabelText('Previous'))
		expect(dispatch).toHaveBeenCalledWith('set_date', { date: '2026-01-16' })
	})

	it('navigates to next month with right chevron', async () => {
		const dispatch = vi.fn()
		const user = userEvent.setup()
		const Component = calendarApp.component
		render(
			<Component
				entityId="cal-1"
				state={{ view: 'month', selected_date: '2026-02-16' }}
				dispatch={dispatch}
			/>,
		)

		await user.click(screen.getByLabelText('Next'))
		expect(dispatch).toHaveBeenCalledWith('set_date', { date: '2026-03-16' })
	})
})
