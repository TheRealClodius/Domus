import { beforeEach, describe, expect, it } from 'vitest'
import { makeEntity, resetAllStores } from '@/core/__tests__/storeTestHelpers'
import { useEntityStore } from '@/core/stores/entityStore'
import { useAgentUiStore } from '@/core/stores/agentUiStore'

describe('agentUiStore', () => {
	beforeEach(() => {
		resetAllStores()
	})
	// --- addPending / removePending / clearAllPending ---

	it('addPending creates entity in store with pending- prefixed id', () => {
		const entity = makeEntity({ id: 'ignored', type: 'image' })
		useAgentUiStore.getState().addPending('tc-1', entity)

		const stored = useEntityStore.getState().entities['pending-tc-1']
		expect(stored).toBeDefined()
		expect(stored.id).toBe('pending-tc-1')
		expect(stored.type).toBe('image')
	})

	it('removePending removes the pending entity by toolCallId', () => {
		const entity = makeEntity({ id: 'ignored' })
		useAgentUiStore.getState().addPending('tc-1', entity)
		expect(useEntityStore.getState().entities['pending-tc-1']).toBeDefined()

		useAgentUiStore.getState().removePending('tc-1')
		expect(useEntityStore.getState().entities['pending-tc-1']).toBeUndefined()
	})

	it('removePending is no-op for unknown toolCallId', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.getState().upsert(entity)

		useAgentUiStore.getState().removePending('unknown')
		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(1)
	})

	it('clearAllPending removes all pending entities but keeps real ones', () => {
		const real = makeEntity({ id: 'real-1' })
		useEntityStore.getState().upsert(real)
		useAgentUiStore.getState().addPending('tc-1', makeEntity({ id: 'ignored-1' }))
		useAgentUiStore.getState().addPending('tc-2', makeEntity({ id: 'ignored-2' }))

		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(3)

		useAgentUiStore.getState().clearAllPending()

		const remaining = useEntityStore.getState().entities
		expect(Object.keys(remaining)).toHaveLength(1)
		expect(remaining['real-1']).toBeDefined()
	})

	it('getVisibleEntities includes pending entities', () => {
		const entity = makeEntity({ id: 'ignored', presentation: 'card' })
		useAgentUiStore.getState().addPending('tc-1', entity)

		const visible = useEntityStore.getState().getVisibleEntities()
		expect(visible.some((e) => e.id === 'pending-tc-1')).toBe(true)
	})


	// --- agentActiveIds / setAgentActive / clearAgentActive / clearAllAgentActive ---

	it('setAgentActive adds an id to agentActiveIds', () => {
		useAgentUiStore.getState().setAgentActive('entity-1')
		expect(useAgentUiStore.getState().agentActiveIds.has('entity-1')).toBe(true)
	})

	it('setAgentActive can add multiple ids', () => {
		useAgentUiStore.getState().setAgentActive('a')
		useAgentUiStore.getState().setAgentActive('b')
		expect(useAgentUiStore.getState().agentActiveIds.has('a')).toBe(true)
		expect(useAgentUiStore.getState().agentActiveIds.has('b')).toBe(true)
	})

	it('clearAgentActive removes a specific id', () => {
		useAgentUiStore.getState().setAgentActive('a')
		useAgentUiStore.getState().setAgentActive('b')
		useAgentUiStore.getState().clearAgentActive('a')
		expect(useAgentUiStore.getState().agentActiveIds.has('a')).toBe(false)
		expect(useAgentUiStore.getState().agentActiveIds.has('b')).toBe(true)
	})

	it('clearAgentActive is a no-op for unknown id', () => {
		useAgentUiStore.getState().setAgentActive('a')
		useAgentUiStore.getState().clearAgentActive('nonexistent')
		expect(useAgentUiStore.getState().agentActiveIds.has('a')).toBe(true)
	})

	it('clearAllAgentActive empties the set', () => {
		useAgentUiStore.getState().setAgentActive('a')
		useAgentUiStore.getState().setAgentActive('b')
		useAgentUiStore.getState().clearAllAgentActive()
		expect(useAgentUiStore.getState().agentActiveIds.size).toBe(0)
	})

	it('each setAgentActive call produces a new Set reference', () => {
		const before = useAgentUiStore.getState().agentActiveIds
		useAgentUiStore.getState().setAgentActive('a')
		const after = useAgentUiStore.getState().agentActiveIds
		expect(after).not.toBe(before)
	})
})
