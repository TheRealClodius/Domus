import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
import { POST } from '../route'

type SpaceResult = { data: unknown; error: unknown }

function makeRequest(body: object) {
	return new Request('http://localhost/api/agent/action-result', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

function mockSupabase(opts: { userId?: string | null; spaceResult?: SpaceResult } = {}) {
	const { userId = 'user-1', spaceResult = { data: { id: 'space-1' }, error: null } } = opts

	const spaceQuery = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue(spaceResult),
	}

	const sb = {
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
		},
		from: vi.fn().mockImplementation((table: string) => {
			if (table === 'spaces') return spaceQuery
			return null
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
		process.env.DOMUS_AGENT_URL = 'https://agent.example.com'
		process.env.DOMUS_SERVICE_TOKEN = 'test-service-token'
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
		process.env.DOMUS_AGENT_URL = originalAgentUrl
		process.env.DOMUS_SERVICE_TOKEN = originalServiceToken
	})

	it('returns 401 when user is not authenticated', async () => {
		mockSupabase({ userId: null })

		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-1' }) as never)

		expect(res.status).toBe(401)
		expect(await res.json()).toEqual({ error: 'Unauthorized' })
	})

	it('returns 400 when space_id is missing', async () => {
		mockSupabase()

		const res = await POST(makeRequest({ action_id: 'act-1' }) as never)

		expect(res.status).toBe(400)
		expect(await res.json()).toEqual({ error: 'Missing space_id' })
	})

	it('returns 400 when action_id is missing', async () => {
		mockSupabase()

		const res = await POST(makeRequest({ space_id: 'space-1' }) as never)

		expect(res.status).toBe(400)
		expect(await res.json()).toEqual({ error: 'Missing action_id' })
	})

	it('returns 403 when the space does not belong to the user', async () => {
		mockSupabase({ spaceResult: { data: null, error: { code: 'PGRST116' } } })

		const res = await POST(makeRequest({ space_id: 'space-other', action_id: 'act-1' }) as never)

		expect(res.status).toBe(403)
		expect(await res.json()).toEqual({ error: 'Forbidden' })
	})

	it('forwards callback to agent and overwrites client-supplied user_id', async () => {
		mockSupabase({ userId: 'session-user' })
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
		globalThis.fetch = fetchMock

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
		expect(fetchMock).toHaveBeenCalledOnce()

		const [url, options] = fetchMock.mock.calls[0]
		expect(url).toBe('https://agent.example.com/agent/action-result')
		expect(options.headers.Authorization).toBe('Bearer test-service-token')

		const sentBody = JSON.parse(options.body)
		expect(sentBody.user_id).toBe('session-user')
		expect(sentBody.user_id).not.toBe('attacker-user')
	})

	it('maps upstream 5xx to 502 and returns action context', async () => {
		mockSupabase()
		globalThis.fetch = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }))

		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-5xx' }) as never)

		expect(res.status).toBe(502)
		expect(await res.json()).toEqual({ ok: false, status: 500, action_id: 'act-5xx' })
	})

	it('passes through upstream 4xx status and returns action context', async () => {
		mockSupabase()
		globalThis.fetch = vi.fn().mockResolvedValue(new Response('bad request', { status: 409 }))

		const res = await POST(makeRequest({ space_id: 'space-1', action_id: 'act-4xx' }) as never)

		expect(res.status).toBe(409)
		expect(await res.json()).toEqual({ ok: false, status: 409, action_id: 'act-4xx' })
	})
})
