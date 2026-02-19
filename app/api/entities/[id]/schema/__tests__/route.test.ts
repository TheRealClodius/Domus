import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

// Mock modules before imports
vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

vi.mock('@/core/supabase/service', () => ({
	getSupabaseServiceClient: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
import { getSupabaseServiceClient } from '@/core/supabase/service'
import { GET } from '../../schema/route'

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

function makeServiceRequest(entityId: string, spaceId = 'space-1') {
	return new Request(`http://localhost/api/entities/${entityId}/schema?space_id=${spaceId}`, {
		headers: { authorization: 'Bearer test-service-token' },
	})
}

function makeCookieRequest(entityId: string) {
	return new Request(`http://localhost/api/entities/${entityId}/schema`)
}

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) }
}

describe('GET /api/entities/[id]/schema', () => {
	const originalEnv = process.env.DOMUS_SERVICE_TOKEN

	beforeEach(() => {
		vi.clearAllMocks()
		process.env.DOMUS_SERVICE_TOKEN = 'test-service-token'
	})

	afterEach(() => {
		process.env.DOMUS_SERVICE_TOKEN = originalEnv
	})

	it('returns tools for calendar entity via service token', async () => {
		const entity = {
			id: 'ent-1',
			type: 'calendar',
			state: { view: 'month', selected_date: '2026-01-01' },
			space_id: 'space-1',
		}
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: () => createQueryMock({ data: entity, error: null })(),
		})

		const res = await GET(makeServiceRequest('ent-1') as never, makeParams('ent-1'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.entity_id).toBe('ent-1')
		expect(json.type).toBe('calendar')
		expect(json.tools).toHaveLength(2)
		expect(json.tools.map((t: { name: string }) => t.name)).toEqual(['set_view', 'set_date'])
	})

	it('returns tools for sounds entity via service token', async () => {
		const entity = {
			id: 'ent-2',
			type: 'sounds',
			state: { playing: false, bpm: 120, swing: 0, voices: {} },
			space_id: 'space-1',
		}
		// sounds hydrate needs voices to be undefined to use defaults, or fully formed.
		// Pass state without voices to trigger hydrate → default state → playing: false → 8 tools
		const entityNoVoices = { ...entity, state: {} }
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: () => createQueryMock({ data: entityNoVoices, error: null })(),
		})

		const res = await GET(makeServiceRequest('ent-2') as never, makeParams('ent-2'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.tools.length).toBeGreaterThanOrEqual(5)
	})

	it('returns 422 for entity type with no schema (note)', async () => {
		const entity = { id: 'ent-3', type: 'note', state: {}, space_id: 'space-1' }
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: () => createQueryMock({ data: entity, error: null })(),
		})

		const res = await GET(makeServiceRequest('ent-3') as never, makeParams('ent-3'))
		const json = await res.json()

		expect(res.status).toBe(422)
		expect(json.error).toBe('no_schema')
		expect(json.type).toBe('note')
	})

	it('returns 401 when no auth provided', async () => {
		const mockSupabase = {
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
		}
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)

		const res = await GET(makeCookieRequest('ent-1') as never, makeParams('ent-1'))
		expect(res.status).toBe(401)
	})

	it('returns 401 for invalid service token', async () => {
		const req = new Request('http://localhost/api/entities/ent-1/schema?space_id=space-1', {
			headers: { authorization: 'Bearer wrong-token' },
		})

		const res = await GET(req as never, makeParams('ent-1'))
		expect(res.status).toBe(401)
	})

	it('returns 404 when entity not found', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: () => createQueryMock({ data: null, error: null })(),
		})

		const res = await GET(makeServiceRequest('nonexistent') as never, makeParams('nonexistent'))
		expect(res.status).toBe(404)
	})

	it('returns 400 when service token but no space_id', async () => {
		const req = new Request('http://localhost/api/entities/ent-1/schema', {
			headers: { authorization: 'Bearer test-service-token' },
		})

		const res = await GET(req as never, makeParams('ent-1'))
		expect(res.status).toBe(400)
	})
})
