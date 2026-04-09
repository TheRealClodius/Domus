import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	handleAction,
	resetTurnState,
	type StreamContext,
} from '@/core/chat/agentActionInterpreter'
import { useEntityStore } from '@/core/entityStore'

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

function seedEntities() {
	const now = new Date().toISOString()
	for (const id of ['c-1', 'c-2']) {
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
		id: 'folder-q',
		space_id: 'sp-1',
		user_id: 'u-1',
		type: 'folder',
		presentation: 'folder',
		position: { x: 400, y: 400, locked: true },
		size: { width: 200, height: 200 },
		z_index: 5,
		content: '',
		state: { child_ids: [], _agentFolder: true },
		summary: 'Queue test folder',
		created_by: 'agent',
		archived: false,
		created_at: now,
		updated_at: now,
	})
}

function resetStore() {
	useEntityStore.setState({
		entities: {},
		focusedId: null,
		_pendingMap: {},
		agentActiveIds: new Set<string>(),
		selectedIds: new Set<string>(),
	})
}

describe('agentActionInterpreter — cross-turn queue isolation', () => {
	beforeEach(() => {
		resetStore()
		resetTurnState()
		fetchSpy.mockClear()
	})

	it('stale queued actions from a prior turn do not mutate entities or post callbacks', async () => {
		seedEntities()
		const before = useEntityStore.getState().entities

		// Turn A: enqueue a gather (takes ~650ms internally)
		handleAction(
			'act-turnA',
			'call_entity_tool',
			{
				entity_id: 'folder-q',
				tool_name: 'add_children',
				child_ids: ['c-1', 'c-2'],
			},
			CTX,
		)

		// Immediately reset (simulating a new turn starting)
		resetTurnState()

		// Wait long enough for the gather animation to have completed
		await new Promise((r) => setTimeout(r, 1500))

		// The stale action from turn A should NOT have posted a callback
		const turnACallbacks = fetchSpy.mock.calls.filter((call: unknown[]) => {
			const body = JSON.parse((call[1] as { body: string }).body)
			return body.action_id === 'act-turnA'
		})
		expect(turnACallbacks).toHaveLength(0)

		// And stale action side effects should be rolled back after reset
		const after = useEntityStore.getState().entities
		expect(after['folder-q'].state?.child_ids).toEqual(before['folder-q'].state?.child_ids)
		expect(after['c-1'].position).toEqual(before['c-1'].position)
		expect(after['c-2'].position).toEqual(before['c-2'].position)
		expect((after['c-1'].state as Record<string, unknown>)._folderId).toBeUndefined()
		expect((after['c-2'].state as Record<string, unknown>)._folderId).toBeUndefined()
	})

	it('new turn actions still execute after reset', async () => {
		seedEntities()

		// Turn A
		handleAction(
			'act-turnA',
			'call_entity_tool',
			{
				entity_id: 'folder-q',
				tool_name: 'add_children',
				child_ids: ['c-1', 'c-2'],
			},
			CTX,
		)

		// Reset into turn B
		resetTurnState()
		resetStore()
		seedEntities()

		// Turn B: create an entity (synchronous, no queue)
		handleAction('act-turnB', 'create_entity', { type: 'note', id: 'new-b' }, CTX)

		await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

		const turnBCallbacks = fetchSpy.mock.calls.filter((call: unknown[]) => {
			const body = JSON.parse((call[1] as { body: string }).body)
			return body.action_id === 'act-turnB'
		})
		expect(turnBCallbacks).toHaveLength(1)
		expect(JSON.parse(turnBCallbacks[0][1].body).success).toBe(true)
	})
})
