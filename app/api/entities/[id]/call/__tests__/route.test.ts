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

	describe('chat tool authorization & SSRF', () => {
		const chatEntity = {
			id: 'chat-1',
			type: 'chat',
			state: {},
			space_id: 'space-1',
		}

		function makeOrderedFromMock(calls: Array<{ select?: unknown; update?: unknown }>) {
			let callIdx = 0
			return vi.fn().mockImplementation(() => {
				const spec = calls[callIdx] ?? calls[calls.length - 1]
				callIdx++
				return spec
			})
		}

		it('list_messages returns 403 not_a_member when user is not in group', async () => {
			;(getSupabaseServiceClient as Mock).mockReturnValue({
				from: makeOrderedFromMock([
					// 1: read entity
					{ select: () => createQueryMock({ data: chatEntity, error: null })() },
					// 2: update entity state
					{ update: () => createQueryMock({ data: null, error: null })() },
					// 3: resolve user_id from spaces
					{ select: () => createQueryMock({ data: { user_id: 'user-1' }, error: null })() },
					// 4: membership check — not a member
					{ select: () => createQueryMock({ data: null, error: null })() },
				]),
			})

			const req = makeServiceRequest('chat-1', {
				tool_name: 'list_messages',
				params: { group_id: 'victim-group' },
			})
			const res = await POST(req as never, makeParams('chat-1'))
			const json = await res.json()

			expect(res.status).toBe(403)
			expect(json.ok).toBe(false)
			expect(json.error).toBe('not_a_member')
		})

		it('send_image returns 400 invalid_image_url for SSRF URL', async () => {
			;(getSupabaseServiceClient as Mock).mockReturnValue({
				from: makeOrderedFromMock([
					// 1: read entity
					{ select: () => createQueryMock({ data: chatEntity, error: null })() },
					// 2: update entity state
					{ update: () => createQueryMock({ data: null, error: null })() },
					// 3: resolve user_id from spaces
					{ select: () => createQueryMock({ data: { user_id: 'user-1' }, error: null })() },
				]),
			})

			const req = makeServiceRequest('chat-1', {
				tool_name: 'send_image',
				params: {
					group_id: 'group-1',
					image_url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
				},
			})
			const res = await POST(req as never, makeParams('chat-1'))
			const json = await res.json()

			expect(res.status).toBe(400)
			expect(json.ok).toBe(false)
			expect(json.error).toBe('invalid_image_url')
		})

		it('send_image returns 403 not_a_member when user is not in group', async () => {
			;(getSupabaseServiceClient as Mock).mockReturnValue({
				from: makeOrderedFromMock([
					// 1: read entity
					{ select: () => createQueryMock({ data: chatEntity, error: null })() },
					// 2: update entity state
					{ update: () => createQueryMock({ data: null, error: null })() },
					// 3: resolve user_id from spaces
					{ select: () => createQueryMock({ data: { user_id: 'user-1' }, error: null })() },
					// 4: membership check — not a member
					{ select: () => createQueryMock({ data: null, error: null })() },
				]),
			})

			const req = makeServiceRequest('chat-1', {
				tool_name: 'send_image',
				params: { group_id: 'victim-group', image_url: 'https://example.com/photo.png' },
			})
			const res = await POST(req as never, makeParams('chat-1'))
			const json = await res.json()

			expect(res.status).toBe(403)
			expect(json.ok).toBe(false)
			expect(json.error).toBe('not_a_member')
		})

		it('send_image returns 413 image_too_large when remote image exceeds size limit', async () => {
			const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
				new Response(new Uint8Array([1, 2, 3]), {
					status: 200,
					headers: {
						'content-type': 'image/png',
						'content-length': String(11 * 1024 * 1024),
					},
				}),
			)
			const uploadMock = vi.fn().mockResolvedValue({ error: null })

			;(getSupabaseServiceClient as Mock).mockReturnValue({
				from: makeOrderedFromMock([
					// 1: read entity
					{ select: () => createQueryMock({ data: chatEntity, error: null })() },
					// 2: update entity state
					{ update: () => createQueryMock({ data: null, error: null })() },
					// 3: resolve user_id from spaces
					{ select: () => createQueryMock({ data: { user_id: 'user-1' }, error: null })() },
					// 4: membership check — is a member
					{
						select: () =>
							createQueryMock({ data: { user_id: 'user-1', group_id: 'group-1' }, error: null })(),
					},
				]),
				storage: {
					from: () => ({
						upload: uploadMock,
					}),
				},
			})

			const req = makeServiceRequest('chat-1', {
				tool_name: 'send_image',
				params: {
					group_id: 'group-1',
					image_url: 'https://example.com/huge-image.png',
				},
			})
			const res = await POST(req as never, makeParams('chat-1'))
			const json = await res.json()

			expect(res.status).toBe(413)
			expect(json.ok).toBe(false)
			expect(json.error).toBe('image_too_large')
			expect(uploadMock).not.toHaveBeenCalled()
			fetchSpy.mockRestore()
		})

		it('send_image passes validation for safe https URL', async () => {
			const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
				new Response(new Uint8Array([1, 2, 3]), {
					status: 200,
					headers: { 'content-type': 'image/png' },
				}),
			)

			;(getSupabaseServiceClient as Mock).mockReturnValue({
				from: makeOrderedFromMock([
					// 1: read entity
					{ select: () => createQueryMock({ data: chatEntity, error: null })() },
					// 2: update entity state
					{ update: () => createQueryMock({ data: null, error: null })() },
					// 3: resolve user_id from spaces
					{ select: () => createQueryMock({ data: { user_id: 'user-1' }, error: null })() },
					// 4: membership check — is a member
					{
						select: () =>
							createQueryMock({ data: { user_id: 'user-1', group_id: 'group-1' }, error: null })(),
					},
					// 5: insert message
					{ insert: () => createQueryMock({ data: null, error: null })() },
				]),
				storage: {
					from: () => ({
						upload: () => Promise.resolve({ error: null }),
					}),
				},
			})

			const req = makeServiceRequest('chat-1', {
				tool_name: 'send_image',
				params: {
					group_id: 'group-1',
					image_url: 'https://example.com/photo.png',
				},
			})
			const res = await POST(req as never, makeParams('chat-1'))
			const json = await res.json()

			expect(res.status).toBe(200)
			expect(json.ok).toBe(true)
			fetchSpy.mockRestore()
		})
	})

	describe('folder side effects', () => {
		const folderEntity = {
			id: 'folder-1',
			type: 'folder',
			state: { child_ids: ['old-child'] },
			space_id: 'space-1',
		}
		const childEntity = { id: 'child-1', state: { title: 'Note' }, space_id: 'space-1' }

		function makeOrderedFromMock(calls: Array<{ select?: unknown; update?: unknown }>) {
			let callIdx = 0
			return vi.fn().mockImplementation(() => {
				const spec = calls[callIdx] ?? calls[calls.length - 1]
				callIdx++
				return spec
			})
		}

		it('add_children writes new child_ids to folder AND patches each child to card with _folderId', async () => {
			const updateMock = vi
				.fn()
				.mockImplementation(() => createQueryMock({ data: null, error: null })())
			;(getSupabaseServiceClient as Mock).mockReturnValue({
				from: makeOrderedFromMock([
					// 1: read folder
					{ select: () => createQueryMock({ data: folderEntity, error: null })() },
					// 2: update folder state
					{ update: updateMock },
					// 3: read child-1 state
					{ select: () => createQueryMock({ data: childEntity, error: null })() },
					// 4: update child-1
					{ update: updateMock },
				]),
			})

			const req = makeServiceRequest('folder-1', {
				tool_name: 'add_children',
				params: { child_ids: ['child-1'] },
			})
			const res = await POST(req as never, makeParams('folder-1'))
			const json = await res.json()

			expect(res.status).toBe(200)
			expect(json.ok).toBe(true)
			expect(json.result.child_ids).toContain('child-1')

			// Folder state write
			const folderWrite = updateMock.mock.calls[0][0] as Record<string, unknown>
			expect((folderWrite.state as Record<string, unknown>).child_ids).toContain('child-1')

			// Child patch write — presentation stays 'card', visibility controlled by _folderId
			const childWrite = updateMock.mock.calls[1][0] as Record<string, unknown>
			expect(childWrite.presentation).toBe('card')
			expect((childWrite.state as Record<string, unknown>)._folderId).toBe('folder-1')
		})

		it('remove_child updates folder state AND patches child to card with _folderId removed', async () => {
			const folderWithChild = { ...folderEntity, state: { child_ids: ['child-1'] } }
			const childWithFolder = { ...childEntity, state: { title: 'Note', _folderId: 'folder-1' } }

			const updateMock = vi
				.fn()
				.mockImplementation(() => createQueryMock({ data: null, error: null })())
			;(getSupabaseServiceClient as Mock).mockReturnValue({
				from: makeOrderedFromMock([
					{ select: () => createQueryMock({ data: folderWithChild, error: null })() },
					{ update: updateMock },
					{ select: () => createQueryMock({ data: childWithFolder, error: null })() },
					{ update: updateMock },
				]),
			})

			const req = makeServiceRequest('folder-1', {
				tool_name: 'remove_child',
				params: { child_id: 'child-1' },
			})
			const res = await POST(req as never, makeParams('folder-1'))
			const json = await res.json()

			expect(res.status).toBe(200)
			expect(json.ok).toBe(true)
			expect(json.result.child_ids).not.toContain('child-1')

			const childWrite = updateMock.mock.calls[1][0] as Record<string, unknown>
			expect(childWrite.presentation).toBe('card')
			expect((childWrite.state as Record<string, unknown>)._folderId).toBeUndefined()
		})

		it('scatter clears folder child_ids AND patches all former children to card', async () => {
			const folderWithTwo = {
				...folderEntity,
				state: { child_ids: ['child-a', 'child-b'] },
			}
			const childA = { id: 'child-a', state: { _folderId: 'folder-1' }, space_id: 'space-1' }
			const childB = { id: 'child-b', state: { _folderId: 'folder-1' }, space_id: 'space-1' }

			const updateMock = vi
				.fn()
				.mockImplementation(() => createQueryMock({ data: null, error: null })())
			// Promise.all starts both child ops concurrently: both selects fire before either update.
			// Actual from() call order: folder-read, folder-write, child-a-select, child-b-select,
			// child-a-update, child-b-update.
			;(getSupabaseServiceClient as Mock).mockReturnValue({
				from: makeOrderedFromMock([
					{ select: () => createQueryMock({ data: folderWithTwo, error: null })() },
					{ update: updateMock },
					{ select: () => createQueryMock({ data: childA, error: null })() },
					{ select: () => createQueryMock({ data: childB, error: null })() },
					{ update: updateMock },
					{ update: updateMock },
				]),
			})

			const req = makeServiceRequest('folder-1', { tool_name: 'scatter', params: {} })
			const res = await POST(req as never, makeParams('folder-1'))
			const json = await res.json()

			expect(res.status).toBe(200)
			expect(json.ok).toBe(true)
			expect(json.result.child_ids).toEqual([])

			// Both children should be patched to card presentation
			expect(updateMock.mock.calls).toHaveLength(3) // folder + 2 children
			for (let i = 1; i <= 2; i++) {
				const childWrite = updateMock.mock.calls[i][0] as Record<string, unknown>
				expect(childWrite.presentation).toBe('card')
				expect((childWrite.state as Record<string, unknown>)._folderId).toBeUndefined()
			}
		})

		it('side effect failure does not fail the whole response', async () => {
			const updateMock = vi
				.fn()
				// First call (folder write) succeeds
				.mockImplementationOnce(() => createQueryMock({ data: null, error: null })())
				// Second call (child write) throws
				.mockImplementationOnce(() => {
					throw new Error('network error')
				})

			;(getSupabaseServiceClient as Mock).mockReturnValue({
				from: makeOrderedFromMock([
					{ select: () => createQueryMock({ data: folderEntity, error: null })() },
					{ update: updateMock },
					// child read succeeds
					{ select: () => createQueryMock({ data: childEntity, error: null })() },
					{ update: updateMock },
				]),
			})

			const req = makeServiceRequest('folder-1', {
				tool_name: 'add_children',
				params: { child_ids: ['child-1'] },
			})
			const res = await POST(req as never, makeParams('folder-1'))
			const json = await res.json()

			// Folder response should still succeed even though the child patch threw
			expect(res.status).toBe(200)
			expect(json.ok).toBe(true)
		})
	})
})
