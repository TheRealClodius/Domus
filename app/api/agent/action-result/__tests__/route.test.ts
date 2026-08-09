import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
import { POST } from '../route'

/** Chainable Supabase query builder mock */
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

function makeRequest(body: Record<string, unknown>) {
	return new Request('http://localhost/api/agent/action-result', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

function mockSupabase(options: { userId?: string | null; spaceOwned?: boolean }) {
	const { userId = 'user-1', spaceOwned = true } = options
	return {
		auth: {
			getUser: vi
				.fn()
				.mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
		},
		from: vi.fn().mockImplementation((table: string) => {
			if (table === 'spaces') {
				return createQueryMock({
					data: spaceOwned ? { id: 'space-1' } : null,
					error: spaceOwned ? null : { code: 'PGRST116' },
				})()
			}
			return createQueryMock({ data: null, error: null })()
		}),
	}
}

describe('POST /api/agent/action-result', () => {
	const originalFetch = globalThis.fetch
	const originalUrl = process.env.DOMUS_AGENT_URL
	const originalToken = process.env.DOMUS_SERVICE_TOKEN

	beforeEach(() => {
		vi.clearAllMocks()
		process.env.DOMUS_AGENT_URL = 'http://agent.internal'
		process.env.DOMUS_SERVICE_TOKEN = 'service-token'
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		process.env.DOMUS_AGENT_URL = originalUrl
		process.env.DOMUS_SERVICE_TOKEN = originalToken
	})

	it('returns 401 when there is no logged-in user', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(
			mockSupabase({ userId: null, spaceOwned: false }),
		)

		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-1' }) as never)
		const json = await res.json()

		expect(res.status).toBe(401)
		expect(json.error).toBe('Unauthorized')
	})

	it('returns 400 when space_id is missing', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase({}))

		const res = await POST(makeRequest({ action_id: 'act-1' }) as never)
		const json = await res.json()

		expect(res.status).toBe(400)
		expect(json.error).toBe('Missing space_id')
	})

	it('returns 400 when action_id is missing', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase({}))

		const res = await POST(makeRequest({ space_id: 'space-1' }) as never)
		const json = await res.json()

		expect(res.status).toBe(400)
		expect(json.error).toBe('Missing action_id')
	})

	it('returns 403 when the space does not belong to the user', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase({ spaceOwned: false }))

		const res = await POST(
			makeRequest({ space_id: 'space-1', action_id: 'act-1', success: true }) as never,
		)
		const json = await res.json()

		expect(res.status).toBe(403)
		expect(json.error).toBe('Forbidden')
	})

	it('overwrites user_id from session and forwards payload to agent service', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase({ userId: 'user-session' }))
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
		globalThis.fetch = fetchMock

		const res = await POST(
			makeRequest({
				space_id: 'space-1',
				action_id: 'act-123',
				user_id: 'attacker-user',
				success: true,
				result: { id: 'entity-1' },
			}) as never,
		)
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.ok).toBe(true)
		expect(fetchMock).toHaveBeenCalledOnce()

		const [url, options] = fetchMock.mock.calls[0]
		expect(url).toBe('http://agent.internal/agent/action-result')
		expect(options.headers.Authorization).toBe('Bearer service-token')
		const sentBody = JSON.parse(options.body)
		expect(sentBody.user_id).toBe('user-session')
		expect(sentBody.user_id).not.toBe('attacker-user')
		expect(sentBody.action_id).toBe('act-123')
	})

	it('returns upstream 4xx status unchanged when agent rejects the callback', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase({}))
		globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 400 }))

		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-4xx' }) as never)
		const json = await res.json()

		expect(res.status).toBe(400)
		expect(json.ok).toBe(false)
		expect(json.status).toBe(400)
		expect(json.action_id).toBe('act-4xx')
	})

	it('maps upstream 5xx failures to 502', async () => {
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase({}))
		globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 503 }))

		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-5xx' }) as never)
		const json = await res.json()

		expect(res.status).toBe(502)
		expect(json.ok).toBe(false)
		expect(json.status).toBe(503)
		expect(json.action_id).toBe('act-5xx')
	})
})
