import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { calendarApp } from '@/apps/calendar'

describe('Calendar app definition', () => {
	it('has correct type, name, and source', () => {
		expect(calendarApp.type).toBe('calendar')
		expect(calendarApp.name).toBe('Calendar')
		expect(calendarApp.source).toBe('built-in')
	})

	it('has correct default presentation and size', () => {
		expect(calendarApp.defaultPresentation).toBe('window')
		expect(calendarApp.defaultSize).toEqual({ width: 500, height: 450 })
	})
})

describe('CalendarApp component', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders without crashing', () => {
		const Component = calendarApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		expect(screen.getByText('Calendar events will appear here')).toBeDefined()
	})
})
