import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

vi.mock('@/core/supabase/service', () => ({
	getSupabaseServiceClient: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
import { getSupabaseServiceClient } from '@/core/supabase/service'
import { POST } from '../route'

function makeServiceRequest(body: object, spaceId = 'space-1') {
	return new Request(`http://localhost/api/entities?space_id=${spaceId}`, {
		method: 'POST',
		headers: {
			authorization: 'Bearer test-service-token',
			'content-type': 'application/json',
		},
		body: JSON.stringify(body),
	})
}

/** Build a chainable mock that returns `result` from `.maybeSingle()` at the end of any chain */
function chainableMaybeSingle(result: { data: unknown; error: unknown }) {
	const chain: Record<string, unknown> = {}
	const proxy: unknown = new Proxy(chain, {
		get(_t, prop) {
			if (prop === 'maybeSingle') return () => Promise.resolve(result)
			return () => proxy
		},
	})
	return () => proxy
}

/** Build a chainable mock that returns `result` from `.single()` at the end of any chain */
function chainableSingle(result: { data: unknown; error: unknown }) {
	const chain: Record<string, unknown> = {}
	const proxy: unknown = new Proxy(chain, {
		get(_t, prop) {
			if (prop === 'single') return () => Promise.resolve(result)
			return () => proxy
		},
	})
	return () => proxy
}

describe('POST /api/entities', () => {
	const originalEnv = process.env.DOMUS_SERVICE_TOKEN

	beforeEach(() => {
		vi.clearAllMocks()
		process.env.DOMUS_SERVICE_TOKEN = 'test-service-token'
	})

	afterEach(() => {
		process.env.DOMUS_SERVICE_TOKEN = originalEnv
	})

	it('creates entity with presentation derived from type (note → card)', async () => {
		const createdEntity = {
			id: 'new-id',
			type: 'note',
			presentation: 'card',
			space_id: 'space-1',
		}
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation((table: string) => {
				if (table === 'spaces') {
					return { select: chainableMaybeSingle({ data: { user_id: 'user-1' }, error: null }) }
				}
				// 'entities' table — note has no maxInstances, so only insert is called
				return {
					insert: () => ({ select: chainableSingle({ data: createdEntity, error: null }) }),
				}
			}),
		})

		const req = makeServiceRequest({ type: 'note' })
		const res = await POST(req as never)
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.presentation).toBe('card')
	})

	it('creates window-type entity with presentation window (chat) when no existing singleton', async () => {
		const createdEntity = {
			id: 'new-id',
			type: 'chat',
			presentation: 'window',
			space_id: 'space-1',
		}
		let entitiesCallCount = 0
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation((table: string) => {
				if (table === 'spaces') {
					return { select: chainableMaybeSingle({ data: { user_id: 'user-1' }, error: null }) }
				}
				// 'entities' table — first call is singleton check (returns null), second is insert
				entitiesCallCount++
				if (entitiesCallCount === 1) {
					return { select: chainableMaybeSingle({ data: null, error: null }) }
				}
				return {
					insert: () => ({ select: chainableSingle({ data: createdEntity, error: null }) }),
				}
			}),
		})

		const req = makeServiceRequest({ type: 'chat' })
		const res = await POST(req as never)
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.presentation).toBe('window')
	})

	it('singleton (maxInstances: 1) returns existing entity instead of creating duplicate', async () => {
		const existingEntity = {
			id: 'existing-id',
			type: 'calendar',
			presentation: 'window',
			space_id: 'space-1',
			archived: false,
		}
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: chainableMaybeSingle({ data: existingEntity, error: null }),
			})),
		})

		const req = makeServiceRequest({ type: 'calendar' })
		const res = await POST(req as never)
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.id).toBe('existing-id')
	})

	it('returns 400 when type is missing', async () => {
		const req = makeServiceRequest({})
		const res = await POST(req as never)
		expect(res.status).toBe(400)
	})

	it('returns 401 without token', async () => {
		const mockSupabase = {
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
		}
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)

		const req = new Request('http://localhost/api/entities?space_id=space-1', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ type: 'note' }),
		})
		const res = await POST(req as never)
		expect(res.status).toBe(401)
	})

	it('cookie auth returns 400 when space_id query parameter is missing', async () => {
		const mockSupabase = {
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
			from: vi.fn(),
		}
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)
		;(getSupabaseServiceClient as Mock).mockReturnValue({ from: vi.fn() })

		const req = new Request('http://localhost/api/entities', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ type: 'note' }),
		})
		const res = await POST(req as never)
		const json = await res.json()

		expect(res.status).toBe(400)
		expect(json.error).toBe('Missing space_id query parameter')
	})

	it('cookie auth returns 403 for space user does not own', async () => {
		const mockSupabase = {
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
			from: vi.fn().mockImplementation(() => ({
				select: chainableMaybeSingle({ data: null, error: null }),
			})),
		}
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)
		;(getSupabaseServiceClient as Mock).mockReturnValue({ from: vi.fn() })

		const req = new Request('http://localhost/api/entities?space_id=other-space', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ type: 'note' }),
		})
		const res = await POST(req as never)
		const json = await res.json()

		expect(res.status).toBe(403)
		expect(json.error).toBe('forbidden')
	})

	it('unknown type defaults to presentation card', async () => {
		const createdEntity = {
			id: 'new-id',
			type: 'custom_widget',
			presentation: 'card',
			space_id: 'space-1',
		}
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation((table: string) => {
				if (table === 'spaces') {
					return { select: chainableMaybeSingle({ data: { user_id: 'user-1' }, error: null }) }
				}
				// Unknown type has no maxInstances, skip singleton check
				return {
					insert: () => ({
						select: chainableSingle({ data: createdEntity, error: null }),
					}),
				}
			}),
		})

		const req = makeServiceRequest({ type: 'custom_widget' })
		const res = await POST(req as never)
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.presentation).toBe('card')
	})

	it('generated app payload with _code forces window presentation', async () => {
		const insertSpy = vi.fn().mockImplementation((entity: Record<string, unknown>) => ({
			select: chainableSingle({ data: { ...entity, id: 'new-id' }, error: null }),
		}))
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation((table: string) => {
				if (table === 'spaces') {
					return { select: chainableMaybeSingle({ data: { user_id: 'user-1' }, error: null }) }
				}
				return { insert: insertSpy }
			}),
		})

		const req = makeServiceRequest({ type: 'custom_widget', state: { _code: 'return 1' } })
		const res = await POST(req as never)
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(insertSpy).toHaveBeenCalled()
		expect(insertSpy.mock.calls[0][0].presentation).toBe('window')
		expect(json.presentation).toBe('window')
	})

	it('returns 500 when insert fails', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation((table: string) => {
				if (table === 'spaces') {
					return { select: chainableMaybeSingle({ data: { user_id: 'user-1' }, error: null }) }
				}
				return {
					insert: () => ({
						select: chainableSingle({ data: null, error: { message: 'db down' } }),
					}),
				}
			}),
		})

		const req = makeServiceRequest({ type: 'note' })
		const res = await POST(req as never)
		const json = await res.json()

		expect(res.status).toBe(500)
		expect(json.error).toBe('create_failed')
	})
})
