import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

vi.mock('@/core/supabase/service', () => ({
	getSupabaseServiceClient: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
import { getSupabaseServiceClient } from '@/core/supabase/service'
import { POST } from '../../call/route'

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

function makeServiceRequest(entityId: string, body: object, spaceId = 'space-1') {
	return new Request(`http://localhost/api/entities/${entityId}/call?space_id=${spaceId}`, {
		method: 'POST',
		headers: {
			authorization: 'Bearer test-service-token',
			'content-type': 'application/json',
		},
		body: JSON.stringify(body),
	})
}

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) }
}

const calendarEntity = {
	id: 'ent-1',
	type: 'calendar',
	state: { view: 'month', selected_date: '2026-01-01' },
	space_id: 'space-1',
}

describe('POST /api/entities/[id]/call', () => {
	const originalEnv = process.env.DOMUS_SERVICE_TOKEN

	beforeEach(() => {
		vi.clearAllMocks()
		process.env.DOMUS_SERVICE_TOKEN = 'test-service-token'
	})

	afterEach(() => {
		process.env.DOMUS_SERVICE_TOKEN = originalEnv
	})

	it('executes tool and returns new state + schema', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation((table: string) => {
				if (table === 'entities') {
					// First call reads, second call updates
					return {
						select: () => createQueryMock({ data: calendarEntity, error: null })(),
						update: () => createQueryMock({ data: null, error: null })(),
					}
				}
				return createQueryMock({ data: null, error: null })()
			}),
		})

		const req = makeServiceRequest('ent-1', { tool_name: 'set_view', params: { view: 'week' } })
		const res = await POST(req as never, makeParams('ent-1'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.ok).toBe(true)
		expect(json.result.view).toBe('week')
		expect(json.summary).toContain('Calendar')
		expect(json.schema).toBeInstanceOf(Array)
		expect(json.schema).toHaveLength(2)
	})

	it('returns tool_not_available error with current schema', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: () => ({
				select: () => createQueryMock({ data: calendarEntity, error: null })(),
			}),
		})

		const req = makeServiceRequest('ent-1', { tool_name: 'nonexistent_tool', params: {} })
		const res = await POST(req as never, makeParams('ent-1'))
		const json = await res.json()

		expect(res.status).toBe(400)
		expect(json.ok).toBe(false)
		expect(json.error).toBe('tool_not_available')
		expect(json.schema).toBeInstanceOf(Array)
	})

	it('state-computed schema changes after tool call (sounds toggle_play)', async () => {
		const soundsEntity = {
			id: 'ent-2',
			type: 'sounds',
			state: {},
			space_id: 'space-1',
		}
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation((table: string) => {
				if (table === 'entities') {
					return {
						select: () => createQueryMock({ data: soundsEntity, error: null })(),
						update: () => createQueryMock({ data: null, error: null })(),
					}
				}
				return createQueryMock({ data: null, error: null })()
			}),
		})

		const req = makeServiceRequest('ent-2', { tool_name: 'toggle_play', params: {} })
		const res = await POST(req as never, makeParams('ent-2'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.ok).toBe(true)
		// After toggle_play (was stopped → now playing), schema should have 5 tools (no pattern editing)
		expect(json.result.playing).toBe(true)
		expect(json.schema).toHaveLength(5)
		const schemaNames = json.schema.map((t: { name: string }) => t.name)
		expect(schemaNames).not.toContain('toggle_step')
	})

	it('returns 401 when no auth provided', async () => {
		const mockSupabase = {
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
		}
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)

		const req = new Request('http://localhost/api/entities/ent-1/call', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ tool_name: 'set_view', params: { view: 'week' } }),
		})
		const res = await POST(req as never, makeParams('ent-1'))
		expect(res.status).toBe(401)
	})

	it('returns 404 when entity not found', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: () => ({
				select: () => createQueryMock({ data: null, error: null })(),
			}),
		})

		const req = makeServiceRequest('nonexistent', { tool_name: 'set_view', params: {} })
		const res = await POST(req as never, makeParams('nonexistent'))
		expect(res.status).toBe(404)
	})

	it('returns 422 for entity type with no schema', async () => {
		const noteEntity = { id: 'ent-3', type: 'note', state: {}, space_id: 'space-1' }
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: () => ({
				select: () => createQueryMock({ data: noteEntity, error: null })(),
			}),
		})

		const req = makeServiceRequest('ent-3', { tool_name: 'whatever', params: {} })
		const res = await POST(req as never, makeParams('ent-3'))
		const json = await res.json()

		expect(res.status).toBe(422)
		expect(json.error).toBe('no_schema')
	})

	it('returns 400 when tool_name is missing', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: () => ({
				select: () => createQueryMock({ data: calendarEntity, error: null })(),
			}),
		})

		const req = makeServiceRequest('ent-1', { params: {} })
		const res = await POST(req as never, makeParams('ent-1'))
		expect(res.status).toBe(400)
	})
})
