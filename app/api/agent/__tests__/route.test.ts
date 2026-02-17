import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

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

/** Chainable Supabase query builder mock (Proxy-based) */
function createQueryMock(result: { data: unknown; error: unknown }) {
	const handler = (): unknown =>
		new Proxy(
			{},
			{
				get(_target, prop) {
					if (prop === 'then') {
						return (resolve: (v: unknown) => void) => resolve(result)
					}
					return handler
				},
			},
		)
	return handler
}

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

/** Create a mock supabase client with configurable space query result */
function mockSupabaseWithSpace(spaceResult: { data: unknown; error: unknown }) {
	return {
		auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
		from: vi.fn().mockImplementation((table: string) => {
			if (table === 'spaces') {
				return createQueryMock(spaceResult)()
			}
			return createQueryMock({ data: null, error: null })()
		}),
	}
}

describe('POST /api/agent', () => {
	const originalFetch = globalThis.fetch

	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	it('returns 413 when Content-Length > 25MB', async () => {
		const req = makeRequest({ contentLength: 26 * 1024 * 1024 })
		const res = await POST(req as never)

		expect(res.status).toBe(413)
		const json = await res.json()
		expect(json.error).toBe('Payload too large')
	})

	it('returns 413 when actual body exceeds 25MB despite small Content-Length', async () => {
		const mockSupabase = mockSupabaseWithSpace({ data: { id: 'space-1' }, error: null })
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)
		;(checkRateLimit as Mock).mockReturnValue({ allowed: true })

		const largeBody = JSON.stringify({ message: 'x'.repeat(26 * 1024 * 1024), space_id: 'space-1' })
		const headers = new Headers({
			'Content-Type': 'application/json',
			'content-length': '100',
		})
		const req = new Request('http://localhost/api/agent', {
			method: 'POST',
			headers,
			body: largeBody,
		})
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

	it('returns 401 when no user session', async () => {
		const mockSupabase = {
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
		}
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)

		const req = makeRequest()
		const res = await POST(req as never)

		expect(res.status).toBe(401)
		const json = await res.json()
		expect(json.error).toBe('Unauthorized')
	})

	it('returns 400 when space_id is missing from body', async () => {
		const mockSupabase = mockSupabaseWithSpace({ data: null, error: null })
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)
		;(checkRateLimit as Mock).mockReturnValue({ allowed: true })

		const req = makeRequest({ body: { message: 'hi' } })
		const res = await POST(req as never)

		expect(res.status).toBe(400)
		const json = await res.json()
		expect(json.error).toBe('Missing space_id')
	})

	it('returns 403 when space_id does not belong to user', async () => {
		const mockSupabase = mockSupabaseWithSpace({ data: null, error: { code: 'PGRST116' } })
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)
		;(checkRateLimit as Mock).mockReturnValue({ allowed: true })

		const req = makeRequest({ body: { message: 'hi', space_id: 'space-other' } })
		const res = await POST(req as never)

		expect(res.status).toBe(403)
		const json = await res.json()
		expect(json.error).toBe('Forbidden')
	})

	it('forwards request to agent when space_id is valid', async () => {
		const mockSupabase = mockSupabaseWithSpace({ data: { id: 'space-1' }, error: null })
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)
		;(checkRateLimit as Mock).mockReturnValue({ allowed: true })

		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode('data: hello\n\n'))
				controller.close()
			},
		})

		const mockFetch = vi
			.fn()
			.mockResolvedValue(
				new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
			)
		globalThis.fetch = mockFetch

		const req = makeRequest({ body: { message: 'hi', space_id: 'space-1' } })
		const res = await POST(req as never)

		expect(res.status).toBe(200)
		expect(res.headers.get('Content-Type')).toBe('text/event-stream')
		expect(mockFetch).toHaveBeenCalledOnce()

		const [url] = mockFetch.mock.calls[0]
		expect(url).toBe('http://localhost:8000/agent')
	})

	it('always overwrites user_id from session, not client-supplied value', async () => {
		const mockSupabase = mockSupabaseWithSpace({ data: { id: 'space-1' }, error: null })
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)
		;(checkRateLimit as Mock).mockReturnValue({ allowed: true })

		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode('data: ok\n\n'))
				controller.close()
			},
		})

		const mockFetch = vi
			.fn()
			.mockResolvedValue(
				new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
			)
		globalThis.fetch = mockFetch

		const req = makeRequest({
			body: { message: 'hi', space_id: 'space-1', user_id: 'attacker-id' },
		})
		await POST(req as never)

		const [, options] = mockFetch.mock.calls[0]
		const sentBody = JSON.parse(options.body)
		expect(sentBody.user_id).toBe('user-1')
		expect(sentBody.user_id).not.toBe('attacker-id')
	})
})
