import { describe, expect, it } from 'vitest'
import type { GoogleCalendarEventRaw } from '@/apps/calendar/googleCalendarTypes'
import { mapGoogleEvent } from '@/apps/calendar/useGoogleCalendarEvents'

describe('mapGoogleEvent', () => {
	it('maps a timed event correctly', () => {
		const raw: GoogleCalendarEventRaw = {
			id: 'abc123',
			summary: 'Team standup',
			start: { dateTime: '2026-02-17T09:00:00-05:00' },
			end: { dateTime: '2026-02-17T09:30:00-05:00' },
		}

		const result = mapGoogleEvent(raw)

		expect(result.id).toBe('gcal-abc123')
		expect(result.state.title).toBe('Team standup')
		expect(result.state.start).toBe('2026-02-17T09:00:00-05:00')
		expect(result.state.end).toBe('2026-02-17T09:30:00-05:00')
		expect(result.state.all_day).toBe(false)
		expect(result.source).toBe('google')
		expect(result.type).toBe('calendar_event')
	})

	it('maps an all-day event correctly', () => {
		const raw: GoogleCalendarEventRaw = {
			id: 'day1',
			summary: 'Holiday',
			start: { date: '2026-02-20' },
			end: { date: '2026-02-21' },
		}

		const result = mapGoogleEvent(raw)

		expect(result.state.all_day).toBe(true)
		expect(result.state.start).toBe('2026-02-20T00:00:00')
		expect(result.state.end).toBe('2026-02-21T00:00:00')
	})

	it('defaults to "(No title)" when summary is missing', () => {
		const raw: GoogleCalendarEventRaw = {
			id: 'notitle',
			start: { dateTime: '2026-02-17T10:00:00' },
			end: { dateTime: '2026-02-17T11:00:00' },
		}

		const result = mapGoogleEvent(raw)

		expect(result.state.title).toBe('(No title)')
		expect(result.summary).toBe('(No title)')
	})

	it('uses "cool" color for Google events', () => {
		const raw: GoogleCalendarEventRaw = {
			id: 'colored',
			summary: 'Meeting',
			start: { dateTime: '2026-02-17T10:00:00' },
			end: { dateTime: '2026-02-17T11:00:00' },
			colorId: '7',
		}

		const result = mapGoogleEvent(raw)

		expect(result.state.color).toBe('cool')
	})

	it('sets presentation to hidden and archived to false', () => {
		const raw: GoogleCalendarEventRaw = {
			id: 'x',
			summary: 'Test',
			start: { dateTime: '2026-02-17T10:00:00' },
			end: { dateTime: '2026-02-17T11:00:00' },
		}

		const result = mapGoogleEvent(raw)

		expect(result.presentation).toBe('hidden')
		expect(result.archived).toBe(false)
	})
})
