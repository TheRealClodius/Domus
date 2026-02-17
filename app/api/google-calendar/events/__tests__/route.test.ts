import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

vi.mock('@/app/api/google-calendar/_lib', () => ({
	GOOGLE_CALENDAR_API: 'https://www.googleapis.com/calendar/v3',
	getGoogleAccessToken: vi.fn().mockResolvedValue('fake-access-token'),
	GoogleCalendarError: class extends Error {
		code: string
		constructor(code: string, message: string) {
			super(message)
			this.code = code
		}
	},
	revokeIntegration: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
import { POST } from '../route'

function mockSupabase() {
	const sb = {
		auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
	}
	;(getSupabaseServerClient as Mock).mockResolvedValue(sb)
	return sb
}

function makeRequest(body: object) {
	return new Request('http://localhost/api/google-calendar/events', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

describe('POST /api/google-calendar/events', () => {
	const originalFetch = globalThis.fetch

	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	it('forwards attendees to Google Calendar API', async () => {
		mockSupabase()
		const mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ id: 'evt-1' }), { status: 200 }))
		globalThis.fetch = mockFetch

		const attendees = [{ email: 'alice@example.com' }, { email: 'bob@example.com' }]
		const req = makeRequest({
			title: 'Team sync',
			start: '2026-02-17T10:00:00Z',
			end: '2026-02-17T11:00:00Z',
			attendees,
		})
		const res = await POST(req as never)

		expect(res.status).toBe(201)
		const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
		expect(sentBody.attendees).toEqual(attendees)
	})

	it('creates event without attendees when none provided', async () => {
		mockSupabase()
		const mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ id: 'evt-2' }), { status: 200 }))
		globalThis.fetch = mockFetch

		const req = makeRequest({
			title: 'Solo focus',
			start: '2026-02-17T14:00:00Z',
			end: '2026-02-17T15:00:00Z',
		})
		const res = await POST(req as never)

		expect(res.status).toBe(201)
		const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
		expect(sentBody.attendees).toBeUndefined()
	})
})
