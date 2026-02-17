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
import { PATCH } from '../route'

function mockSupabase() {
	const sb = {
		auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
	}
	;(getSupabaseServerClient as Mock).mockResolvedValue(sb)
	return sb
}

function makeRequest(body: object) {
	return new Request('http://localhost/api/google-calendar/events/evt-1', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

const params = Promise.resolve({ eventId: 'evt-1' })

describe('PATCH /api/google-calendar/events/[eventId]', () => {
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

		const attendees = [{ email: 'alice@example.com' }]
		const req = makeRequest({ attendees })
		const res = await PATCH(req as never, { params })

		expect(res.status).toBe(200)
		const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
		expect(sentBody.attendees).toEqual(attendees)
	})

	it('patches without attendees when none provided', async () => {
		mockSupabase()
		const mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ id: 'evt-1' }), { status: 200 }))
		globalThis.fetch = mockFetch

		const req = makeRequest({ title: 'Updated title' })
		const res = await PATCH(req as never, { params })

		expect(res.status).toBe(200)
		const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
		expect(sentBody.attendees).toBeUndefined()
		expect(sentBody.summary).toBe('Updated title')
	})
})
