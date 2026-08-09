import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
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

function makeRequest(body: object) {
	return new Request('http://localhost/api/agent/action-result', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

function mockSupabase(options?: { userId?: string | null; hasSpace?: boolean }) {
	const userId = options && 'userId' in options ? options.userId : 'user-1'
	const hasSpace = options?.hasSpace ?? true
	return {
		auth: {
			getUser: vi
				.fn()
				.mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
		},
		from: vi.fn().mockImplementation((table: string) => {
			if (table === 'spaces') {
				return createQueryMock({
					data: hasSpace ? { id: 'space-1' } : null,
					error: null,
				})()
			}
			return createQueryMock({ data: null, error: null })()
		}),
	}
}

describe('POST /api/agent/action-result', () => {
	const originalFetch = globalThis.fetch
	const originalAgentUrl = process.env.DOMUS_AGENT_URL
	const originalServiceToken = process.env.DOMUS_SERVICE_TOKEN

	beforeEach(() => {
		vi.clearAllMocks()
		process.env.DOMUS_AGENT_URL = 'http://agent.test'
		process.env.DOMUS_SERVICE_TOKEN = 'test-service-token'
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		process.env.DOMUS_AGENT_URL = originalAgentUrl
		process.env.DOMUS_SERVICE_TOKEN = originalServiceToken
	})

	it('returns 401 when user session is missing', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase({ userId: null }))

		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-1' }) as never)
		const json = await res.json()

		expect(res.status).toBe(401)
		expect(json.error).toBe('Unauthorized')
	})

	it('returns 400 when space_id is missing', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase())

		const res = await POST(makeRequest({ action_id: 'act-1' }) as never)
		const json = await res.json()

		expect(res.status).toBe(400)
		expect(json.error).toBe('Missing space_id')
	})

	it('returns 400 when action_id is missing', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase())

		const res = await POST(makeRequest({ space_id: 'space-1' }) as never)
		const json = await res.json()

		expect(res.status).toBe(400)
		expect(json.error).toBe('Missing action_id')
	})

	it('returns 403 when space does not belong to user', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase({ hasSpace: false }))

		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-1' }) as never)
		const json = await res.json()

		expect(res.status).toBe(403)
		expect(json.error).toBe('Forbidden')
	})

	it('forwards payload and overwrites user_id from session', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase({ userId: 'user-123' }))
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
		globalThis.fetch = fetchMock

		const res = await POST(
			makeRequest({
				space_id: 'space-1',
				action_id: 'act-2',
				success: true,
				user_id: 'attacker-user',
			}) as never,
		)
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json).toEqual({ ok: true })
		expect(fetchMock).toHaveBeenCalledOnce()
		const [url, options] = fetchMock.mock.calls[0]
		expect(url).toBe('http://agent.test/agent/action-result')
		expect(options.headers.Authorization).toBe('Bearer test-service-token')
		const sentBody = JSON.parse(options.body)
		expect(sentBody.user_id).toBe('user-123')
		expect(sentBody.user_id).not.toBe('attacker-user')
		expect(sentBody.action_id).toBe('act-2')
	})

	it('propagates non-5xx agent errors as-is', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase())
		globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 422 }))

		const res = await POST(
			makeRequest({ space_id: 'space-1', action_id: 'act-422', success: false }) as never,
		)
		const json = await res.json()

		expect(res.status).toBe(422)
		expect(json).toEqual({ ok: false, status: 422, action_id: 'act-422' })
	})

	it('maps agent 5xx responses to 502 gateway status', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase())
		globalThis.fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }))

		const res = await POST(
			makeRequest({ space_id: 'space-1', action_id: 'act-503', success: false }) as never,
		)
		const json = await res.json()

		expect(res.status).toBe(502)
		expect(json).toEqual({ ok: false, status: 503, action_id: 'act-503' })
	})
})
