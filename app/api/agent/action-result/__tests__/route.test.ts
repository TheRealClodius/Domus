import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
import { POST } from '../route'

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

function mockSupabase(options: { userId?: string | null; spaceOwned?: boolean }) {
	const userId = options.userId ?? 'user-1'
	const spaceOwned = options.spaceOwned ?? true
	const sb = {
		auth: {
			getUser: vi
				.fn()
				.mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
		},
		from: vi.fn().mockImplementation((table: string) => {
			if (table === 'spaces') {
				return createQueryMock({
					data: spaceOwned ? { id: 'space-1' } : null,
					error: null,
				})()
			}
			return createQueryMock({ data: null, error: null })()
		}),
	}
	;(getSupabaseServerClient as Mock).mockResolvedValue(sb)
	return sb
}

describe('POST /api/agent/action-result', () => {
	const originalFetch = globalThis.fetch
	const originalAgentUrl = process.env.DOMUS_AGENT_URL
	const originalServiceToken = process.env.DOMUS_SERVICE_TOKEN

	beforeEach(() => {
		vi.clearAllMocks()
		process.env.DOMUS_AGENT_URL = 'http://agent.internal'
		process.env.DOMUS_SERVICE_TOKEN = 'service-token'
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		process.env.DOMUS_AGENT_URL = originalAgentUrl
		process.env.DOMUS_SERVICE_TOKEN = originalServiceToken
	})

	it('returns 401 when no authenticated user is present', async () => {
		mockSupabase({ userId: null })
		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-1' }) as never)
		expect(res.status).toBe(401)
		expect(await res.json()).toEqual({ error: 'Unauthorized' })
	})

	it('returns 400 when space_id is missing', async () => {
		mockSupabase({ userId: 'user-1' })
		const res = await POST(makeRequest({ action_id: 'act-1' }) as never)
		expect(res.status).toBe(400)
		expect(await res.json()).toEqual({ error: 'Missing space_id' })
	})

	it('returns 403 when space does not belong to user', async () => {
		mockSupabase({ userId: 'user-1', spaceOwned: false })
		const mockFetch = vi.fn()
		globalThis.fetch = mockFetch

		const res = await POST(
			makeRequest({ space_id: 'space-1', action_id: 'act-1', success: true }) as never,
		)
		expect(res.status).toBe(403)
		expect(await res.json()).toEqual({ error: 'Forbidden' })
		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('overwrites user_id from session and forwards to configured agent URL', async () => {
		mockSupabase({ userId: 'real-user' })
		const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
		globalThis.fetch = mockFetch

		const res = await POST(
			makeRequest({
				space_id: 'space-1',
				action_id: 'act-1',
				user_id: 'attacker-user',
				success: true,
			}) as never,
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ ok: true })

		expect(mockFetch).toHaveBeenCalledOnce()
		const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
		expect(url).toBe('http://agent.internal/agent/action-result')
		expect(options.headers).toEqual({
			'Content-Type': 'application/json',
			Authorization: 'Bearer service-token',
		})
		const body = JSON.parse(options.body as string)
		expect(body.user_id).toBe('real-user')
		expect(body.user_id).not.toBe('attacker-user')
	})

	it('maps upstream 5xx to 502 while preserving upstream status in payload', async () => {
		mockSupabase({ userId: 'user-1' })
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ error: 'upstream down' }), { status: 503 }))

		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-503' }) as never)
		expect(res.status).toBe(502)
		expect(await res.json()).toEqual({ ok: false, status: 503, action_id: 'act-503' })
	})

	it('passes through upstream 4xx status codes', async () => {
		mockSupabase({ userId: 'user-1' })
		globalThis.fetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ error: 'bad request' }), { status: 400 }))

		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-400' }) as never)
		expect(res.status).toBe(400)
		expect(await res.json()).toEqual({ ok: false, status: 400, action_id: 'act-400' })
	})
})
