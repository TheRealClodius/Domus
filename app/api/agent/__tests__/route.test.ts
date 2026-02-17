import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

vi.mock('../rateLimit', () => ({
	checkRateLimit: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
import { checkRateLimit } from '../rateLimit'

// Import the handler after mocks are set up
import { POST } from '../route'

function makeRequest(options: { contentLength?: number; body?: object } = {}) {
	const body = JSON.stringify(options.body ?? { message: 'hi' })
	const headers = new Headers({ 'Content-Type': 'application/json' })
	if (options.contentLength !== undefined) {
		headers.set('content-length', String(options.contentLength))
	} else {
		headers.set('content-length', String(body.length))
	}
	return new Request('http://localhost/api/agent', {
		method: 'POST',
		headers,
		body,
	})
}

describe('POST /api/agent', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 413 when Content-Length > 25MB', async () => {
		const req = makeRequest({ contentLength: 26 * 1024 * 1024 })
		const res = await POST(req as never)

		expect(res.status).toBe(413)
		const json = await res.json()
		expect(json.error).toBe('Payload too large')
	})

	it('returns 429 when rate limit exceeded', async () => {
		const mockSupabase = {
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
		}
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)
		;(checkRateLimit as Mock).mockReturnValue({ allowed: false })

		const req = makeRequest()
		const res = await POST(req as never)

		expect(res.status).toBe(429)
		const json = await res.json()
		expect(json.error).toBe('Too many requests')
	})
})
