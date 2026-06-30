import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	buildPendingEntity,
	handleAction,
	isEntityPayload,
	isHandledByUIAction,
	isSelfWrite,
	resetTurnState,
	type StreamContext,
} from '@/core/agent-chat/agentActionInterpreter'
import { resetAllStores } from '@/core/__tests__/storeTestHelpers'
import { useAgentUiStore, useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'

// Mock Supabase client so writeEntity doesn't throw
vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => ({
		from: vi.fn().mockReturnValue({
			upsert: vi.fn().mockResolvedValue({ error: null }),
		}),
	}),
}))

// Mock fetch for action-result callbacks
const fetchSpy = vi.fn().mockResolvedValue({ ok: true })
vi.stubGlobal('fetch', fetchSpy)

const CTX: StreamContext = {
	spaceId: 'sp-1',
	userId: 'u-1',
	viewport: { width: 1440, height: 900 },
}

function resetStore() {
	resetAllStores()
}

describe('agentActionInterpreter', () => {
	beforeEach(() => {
		resetStore()
		resetTurnState()
		fetchSpy.mockClear()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('buildPendingEntity', () => {
		it('creates a pending entity with grid position', () => {
			const entity = buildPendingEntity({ type: 'image', summary: 'Cat' }, CTX, 0)
			expect(entity.type).toBe('image')
			expect(entity.summary).toBe('Cat')
			expect(entity.state._pending).toBe(true)
			expect(entity.position.x).toBeGreaterThan(0)
			expect(entity.position.y).toBeGreaterThan(0)
		})

		it('assigns distinct positions for different indices', () => {
			const a = buildPendingEntity({ type: 'note' }, CTX, 0)
			const b = buildPendingEntity({ type: 'note' }, CTX, 1)
			expect(a.position.x).not.toBe(b.position.x)
		})
	})

	describe('isEntityPayload', () => {
		it('returns true for a valid entity shape', () => {
			expect(
				isEntityPayload({
					id: 'e-1',
					type: 'note',
					presentation: 'card',
					space_id: 'sp-1',
					position: { x: 0, y: 0 },
					size: { width: 100, height: 100 },
				}),
			).toBe(true)
		})

		it('returns false for non-entity shapes', () => {
			expect(isEntityPayload({ items: [] })).toBe(false)
		})
	})

	describe('handleAction — create_entity', () => {
		it('creates a card entity, focuses it, and posts callback', async () => {
			handleAction(
				'act-1',
				'create_entity',
				{
					type: 'note',
					content: 'Hello',
					summary: 'A note',
					presentation: 'card',
				},
				CTX,
			)

			// Wait for async callback
			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			const entities = useEntityStore.getState().entities
			const ids = Object.keys(entities)
			expect(ids.length).toBe(1)

			const entity = entities[ids[0]]
			expect(entity.type).toBe('note')
			expect(entity.content).toBe('Hello')
			expect(entity.created_by).toBe('agent')

			// Should be focused
			expect(useEntityStore.getState().focusedId).toBe(entity.id)

			// Callback posted
			const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
			expect(callBody.action_id).toBe('act-1')
			expect(callBody.success).toBe(true)
			expect(callBody.result.type).toBe('note')
		})

		it('creates a folder entity with _agentFolder marker and does NOT focus', async () => {
			handleAction(
				'act-2',
				'create_entity',
				{
					type: 'folder',
					summary: 'Research',
					state: { child_ids: [] },
				},
				CTX,
			)

			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			const entities = useEntityStore.getState().entities
			const folder = Object.values(entities).find((e) => e.type === 'folder')
			expect(folder).toBeDefined()
			expect(folder?.state._agentFolder).toBe(true)
			// Folders are NOT focused on create (they'll be focused after gather)
			expect(useEntityStore.getState().focusedId).not.toBe(folder?.id)
		})

		it('includes schema.tools in postActionResult for folder entities', async () => {
			handleAction(
				'act-folder-schema',
				'create_entity',
				{
					type: 'folder',
					summary: 'My Folder',
					state: { child_ids: [] },
				},
				CTX,
			)

			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
			expect(callBody.success).toBe(true)
			expect(callBody.result.schema).toBeDefined()
			expect(Array.isArray(callBody.result.schema.tools)).toBe(true)
			const toolNames = callBody.result.schema.tools.map((t: { name: string }) => t.name)
			expect(toolNames).toContain('add_children')
		})

		it('does not include schema in postActionResult for non-folder entities', async () => {
			handleAction('act-note-no-schema', 'create_entity', { type: 'note', content: 'Hello' }, CTX)

			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
			expect(callBody.success).toBe(true)
			expect(callBody.result.schema).toBeUndefined()
		})

		it('marks entity as handled by ui_action', () => {
			handleAction('act-3', 'create_entity', { type: 'note', id: 'known-id' }, CTX)

			expect(isHandledByUIAction('known-id')).toBe(true)
		})
	})

	describe('handleAction — update_entity', () => {
		it('updates an existing entity and focuses it', async () => {
			// Seed an entity
			useEntityStore.getState().upsert({
				id: 'e-existing',
				space_id: 'sp-1',
				user_id: 'u-1',
				type: 'note',
				presentation: 'card',
				position: { x: 100, y: 100, locked: true },
				size: { width: 300, height: 200 },
				z_index: 1,
				content: 'old',
				state: {},
				summary: 'Old note',
				created_by: 'user',
				archived: false,
				created_at: '2026-01-01',
				updated_at: '2026-01-01',
			})

			handleAction(
				'act-4',
				'update_entity',
				{ id: 'e-existing', content: 'new content', summary: 'Updated' },
				CTX,
			)

			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			const entity = useEntityStore.getState().entities['e-existing']
			expect(entity.content).toBe('new content')
			expect(entity.summary).toBe('Updated')
			expect(useEntityStore.getState().focusedId).toBe('e-existing')
		})

		it('posts error callback for missing entity', async () => {
			handleAction('act-5', 'update_entity', { id: 'nonexistent' }, CTX)

			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
			expect(callBody.success).toBe(false)
			expect(callBody.error).toContain('not found')
		})
	})

	describe('handleAction — call_entity_tool (add_children)', () => {
		it('queues gather animation and posts callback', async () => {
			// Seed children + folder
			const now = new Date().toISOString()
			for (const id of ['c-1', 'c-2', 'c-3']) {
				useEntityStore.getState().upsert({
					id,
					space_id: 'sp-1',
					user_id: 'u-1',
					type: 'note',
					presentation: 'card',
					position: { x: 200, y: 200, locked: true },
					size: { width: 232, height: 300 },
					z_index: 1,
					content: '',
					state: {},
					summary: '',
					created_by: 'agent',
					archived: false,
					created_at: now,
					updated_at: now,
				})
			}
			useEntityStore.getState().upsert({
				id: 'folder-1',
				space_id: 'sp-1',
				user_id: 'u-1',
				type: 'folder',
				presentation: 'folder',
				position: { x: 400, y: 400, locked: true },
				size: { width: 200, height: 200 },
				z_index: 5,
				content: '',
				state: { child_ids: [], _agentFolder: true },
				summary: 'Research',
				created_by: 'agent',
				archived: false,
				created_at: now,
				updated_at: now,
			})

			handleAction(
				'act-gather',
				'call_entity_tool',
				{
					entity_id: 'folder-1',
					tool_name: 'add_children',
					child_ids: ['c-1', 'c-2', 'c-3'],
				},
				CTX,
			)

			// Agent attention should be set
			expect(useAgentUiStore.getState().agentActiveIds.has('folder-1')).toBe(true)

			// Wait for the gather animation queue to drain + callback
			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled(), { timeout: 5000 })

			const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
			expect(callBody.action_id).toBe('act-gather')
			expect(callBody.success).toBe(true)
		})
	})

	describe('isSelfWrite', () => {
		it('returns false for unknown IDs', () => {
			expect(isSelfWrite('random-id')).toBe(false)
		})

		it('returns true for entity IDs after create_entity action', async () => {
			handleAction('act-sw', 'create_entity', { type: 'note', id: 'sw-entity' }, CTX)

			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			// The entity was written to Supabase, so it should be tracked as self-write
			expect(isSelfWrite('sw-entity')).toBe(true)
		})
	})

	describe('handleAction — unknown action', () => {
		it('posts error callback for unknown action names', async () => {
			handleAction('act-unknown', 'teleport_entity', { id: 'e-1' }, CTX)

			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
			expect(callBody.success).toBe(false)
			expect(callBody.error).toContain('Unknown action')
		})
	})

	describe('handleAction — update_entity missing id', () => {
		it('posts error callback when id param is missing', async () => {
			handleAction('act-no-id', 'update_entity', { content: 'oops' }, CTX)

			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
			expect(callBody.success).toBe(false)
			expect(callBody.error).toContain('Missing entity id')
		})
	})

	describe('resetTurnState', () => {
		it('clears handled entity IDs', () => {
			handleAction('act-r', 'create_entity', { type: 'note', id: 'r-id' }, CTX)
			expect(isHandledByUIAction('r-id')).toBe(true)

			resetTurnState()
			expect(isHandledByUIAction('r-id')).toBe(false)
		})
	})

	describe('handleAction — open_sheet', () => {
		it('opens the sheet for the given entity_id and posts success callback', async () => {
			handleAction('act-sheet', 'open_sheet', { entity_id: 'e-note' }, CTX)

			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			const sheet = useSheetStore.getState()
			expect(sheet.isOpen).toBe(true)
			expect(sheet.entityId).toBe('e-note')
			expect(sheet.contentType).toBe('entity')

			const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
			expect(callBody.action_id).toBe('act-sheet')
			expect(callBody.success).toBe(true)
			expect(callBody.result.entity_id).toBe('e-note')
		})

		it('posts error callback when entity_id is missing', async () => {
			handleAction('act-sheet-err', 'open_sheet', {}, CTX)

			await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

			const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
			expect(callBody.success).toBe(false)
			expect(callBody.error).toContain('Missing entity_id')
		})
	})
})
