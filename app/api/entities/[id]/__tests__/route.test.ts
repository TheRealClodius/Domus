import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

vi.mock('@/core/supabase/service', () => ({
	getSupabaseServiceClient: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
import { getSupabaseServiceClient } from '@/core/supabase/service'
import { DELETE, PATCH } from '../route'

function makeServiceRequest(
	method: string,
	id: string,
	body?: object,
	extra?: string,
	spaceId = 'space-1',
) {
	const url = `http://localhost/api/entities/${id}?space_id=${spaceId}${extra ?? ''}`
	return new Request(url, {
		method,
		headers: {
			authorization: 'Bearer test-service-token',
			'content-type': 'application/json',
		},
		...(body !== undefined ? { body: JSON.stringify(body) } : {}),
	})
}

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) }
}

/** Proxy that returns itself for any method call, resolving with `result` on `.single()` */
function chainableSingle(result: { data: unknown; error: unknown }) {
	const proxy: unknown = new Proxy(
		{},
		{
			get(_t, prop) {
				if (prop === 'single') return () => Promise.resolve(result)
				return () => proxy
			},
		},
	)
	return () => proxy
}

/** Proxy that returns itself for any method call, resolving with `result` on `.maybeSingle()` */
function chainableMaybySingle(result: { data: unknown; error: unknown }) {
	const proxy: unknown = new Proxy(
		{},
		{
			get(_t, prop) {
				if (prop === 'maybeSingle') return () => Promise.resolve(result)
				return () => proxy
			},
		},
	)
	return () => proxy
}

const noteEntity = {
	id: 'ent-1',
	type: 'note',
	presentation: 'card',
	space_id: 'space-1',
	state: {},
	archived: false,
}

const chatEntity = {
	id: 'ent-2',
	type: 'chat',
	presentation: 'window',
	space_id: 'space-1',
	state: {},
	archived: false,
}

const folderEntity = {
	id: 'folder-1',
	type: 'folder',
	presentation: 'folder',
	space_id: 'space-1',
	state: { child_ids: ['child-a', 'child-b'] },
	archived: false,
}

describe('PATCH /api/entities/[id]', () => {
	const originalEnv = process.env.DOMUS_SERVICE_TOKEN

	beforeEach(() => {
		vi.clearAllMocks()
		process.env.DOMUS_SERVICE_TOKEN = 'test-service-token'
	})

	afterEach(() => {
		process.env.DOMUS_SERVICE_TOKEN = originalEnv
	})

	it('coerces invalid presentation (note with window → card)', async () => {
		const updatedEntity = { ...noteEntity, presentation: 'card' }
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: chainableMaybySingle({ data: noteEntity, error: null }),
				update: () => ({
					eq: () => ({ select: chainableSingle({ data: updatedEntity, error: null }) }),
				}),
			})),
		})

		const req = makeServiceRequest('PATCH', 'ent-1', { presentation: 'window' })
		const res = await PATCH(req as never, makeParams('ent-1'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.presentation).toBe('card')
	})

	it('never changes folder presentation from folder', async () => {
		const emptyFolder = { ...folderEntity, state: { child_ids: [] } }
		const updatedEntity = { ...emptyFolder, presentation: 'folder' }
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: chainableMaybySingle({ data: emptyFolder, error: null }),
				update: () => ({
					eq: () => ({ select: chainableSingle({ data: updatedEntity, error: null }) }),
				}),
			})),
		})

		const req = makeServiceRequest('PATCH', 'folder-1', { presentation: 'card' })
		const res = await PATCH(req as never, makeParams('folder-1'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.presentation).toBe('folder')
	})

	it('window-type entity can set presentation to hidden', async () => {
		const hiddenEntity = { ...chatEntity, presentation: 'hidden' }
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: chainableMaybySingle({ data: chatEntity, error: null }),
				update: () => ({
					eq: () => ({ select: chainableSingle({ data: hiddenEntity, error: null }) }),
				}),
			})),
		})

		const req = makeServiceRequest('PATCH', 'ent-2', { presentation: 'hidden' })
		const res = await PATCH(req as never, makeParams('ent-2'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.presentation).toBe('hidden')
	})

	it('returns 401 without token', async () => {
		const mockSupabase = {
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
		}
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)

		const req = new Request('http://localhost/api/entities/ent-1', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ content: 'hello' }),
		})
		const res = await PATCH(req as never, makeParams('ent-1'))
		expect(res.status).toBe(401)
	})

	it('returns 404 when entity not found', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: chainableMaybySingle({ data: null, error: null }),
			})),
		})

		const req = makeServiceRequest('PATCH', 'nonexistent', { content: 'hello' })
		const res = await PATCH(req as never, makeParams('nonexistent'))
		expect(res.status).toBe(404)
	})
})

describe('DELETE /api/entities/[id]', () => {
	const originalEnv = process.env.DOMUS_SERVICE_TOKEN

	beforeEach(() => {
		vi.clearAllMocks()
		process.env.DOMUS_SERVICE_TOKEN = 'test-service-token'
	})

	afterEach(() => {
		process.env.DOMUS_SERVICE_TOKEN = originalEnv
	})

	it('archives a regular entity', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: chainableMaybySingle({ data: noteEntity, error: null }),
				update: () => ({ eq: () => Promise.resolve({ error: null }) }),
			})),
		})

		const req = makeServiceRequest('DELETE', 'ent-1')
		const res = await DELETE(req as never, makeParams('ent-1'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.ok).toBe(true)
	})

	it('returns 409 when deleting folder with children (no force)', async () => {
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: chainableMaybySingle({ data: folderEntity, error: null }),
			})),
		})

		const req = makeServiceRequest('DELETE', 'folder-1')
		const res = await DELETE(req as never, makeParams('folder-1'))
		const json = await res.json()

		expect(res.status).toBe(409)
		expect(json.error).toBe('folder_has_children')
		expect(json.count).toBe(2)
		expect(json.child_ids).toEqual(['child-a', 'child-b'])
	})

	it('archives folder and all children with ?force=true', async () => {
		const updateMock = vi.fn().mockImplementation(() => ({
			eq: () => Promise.resolve({ error: null }),
			in: () => Promise.resolve({ error: null }),
		}))
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: chainableMaybySingle({ data: folderEntity, error: null }),
				update: updateMock,
			})),
		})

		const req = makeServiceRequest('DELETE', 'folder-1', undefined, '&force=true')
		const res = await DELETE(req as never, makeParams('folder-1'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.ok).toBe(true)
		// update called twice: once for children (with .in), once for folder (with .eq)
		expect(updateMock).toHaveBeenCalledTimes(2)
	})

	it('archives empty folder without confirmation', async () => {
		const emptyFolder = { ...folderEntity, state: { child_ids: [] } }
		const updateMock = vi.fn().mockImplementation(() => ({
			eq: () => Promise.resolve({ error: null }),
		}))
		;(getSupabaseServiceClient as Mock).mockReturnValue({
			from: vi.fn().mockImplementation(() => ({
				select: chainableMaybySingle({ data: emptyFolder, error: null }),
				update: updateMock,
			})),
		})

		const req = makeServiceRequest('DELETE', 'folder-1')
		const res = await DELETE(req as never, makeParams('folder-1'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.ok).toBe(true)
	})

	it('returns 401 without token', async () => {
		const mockSupabase = {
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
		}
		;(getSupabaseServerClient as Mock).mockResolvedValue(mockSupabase)

		const req = new Request('http://localhost/api/entities/ent-1', { method: 'DELETE' })
		const res = await DELETE(req as never, makeParams('ent-1'))
		expect(res.status).toBe(401)
	})
})
