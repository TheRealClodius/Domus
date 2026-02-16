import { afterEach, describe, expect, it } from 'vitest'
import { useConversationStore } from '@/core/chat/conversationStore'

describe('conversationStore', () => {
	afterEach(() => {
		useConversationStore.getState().reset()
	})

	it('starts idle with no turns', () => {
		const state = useConversationStore.getState()
		expect(state.status).toBe('idle')
		expect(state.turns).toEqual([])
		expect(state.currentTurn).toBeNull()
		expect(state.panelVisible).toBe(false)
	})

	it('addUserTurn appends a user turn and shows panel', () => {
		const { addUserTurn } = useConversationStore.getState()
		addUserTurn('Hello agent')
		const state = useConversationStore.getState()
		expect(state.turns).toHaveLength(1)
		expect(state.turns[0].role).toBe('user')
		expect(state.turns[0].text).toBe('Hello agent')
		expect(state.panelVisible).toBe(true)
	})

	it('startAgentTurn sets status to streaming and creates currentTurn', () => {
		const { startAgentTurn } = useConversationStore.getState()
		startAgentTurn()
		const state = useConversationStore.getState()
		expect(state.status).toBe('streaming')
		expect(state.currentTurn).toEqual(
			expect.objectContaining({ role: 'agent', text: '', toolCalls: [] }),
		)
	})

	it('appendTextDelta appends to currentTurn.text', () => {
		const store = useConversationStore.getState()
		store.startAgentTurn()
		store.appendTextDelta('Hello ')
		store.appendTextDelta('world')
		expect(useConversationStore.getState().currentTurn?.text).toBe('Hello world')
	})

	it('appendTextDelta is a no-op when no currentTurn', () => {
		useConversationStore.getState().appendTextDelta('orphan')
		expect(useConversationStore.getState().currentTurn).toBeNull()
	})

	it('startToolCall adds a pending tool call', () => {
		const store = useConversationStore.getState()
		store.startAgentTurn()
		store.startToolCall('tc-1', 'create_entity')
		const calls = useConversationStore.getState().currentTurn?.toolCalls
		expect(calls).toHaveLength(1)
		expect(calls?.[0]).toEqual({
			id: 'tc-1',
			tool: 'create_entity',
			status: 'pending',
			result: null,
		})
	})

	it('resolveToolCall marks tool call as done with result', () => {
		const store = useConversationStore.getState()
		store.startAgentTurn()
		store.startToolCall('tc-1', 'create_entity')
		store.resolveToolCall('tc-1', { id: 'entity-1', type: 'note', summary: 'A note' })
		const call = useConversationStore.getState().currentTurn?.toolCalls[0]
		expect(call?.status).toBe('done')
		expect(call?.result).toEqual({ id: 'entity-1', type: 'note', summary: 'A note' })
	})

	it('completeTurn pushes currentTurn to turns and resets', () => {
		const store = useConversationStore.getState()
		store.addUserTurn('hi')
		store.startAgentTurn()
		store.appendTextDelta('Hello!')
		store.completeTurn('Said hello')
		const state = useConversationStore.getState()
		expect(state.turns).toHaveLength(2)
		expect(state.turns[1].role).toBe('agent')
		expect(state.turns[1].text).toBe('Hello!')
		expect(state.turns[1].summary).toBe('Said hello')
		expect(state.currentTurn).toBeNull()
		expect(state.status).toBe('idle')
	})

	it('setError sets status to error', () => {
		const store = useConversationStore.getState()
		store.startAgentTurn()
		store.setError('Something broke')
		const state = useConversationStore.getState()
		expect(state.status).toBe('error')
		expect(state.error).toBe('Something broke')
	})

	it('dismissPanel hides the panel', () => {
		const store = useConversationStore.getState()
		store.addUserTurn('hi')
		expect(useConversationStore.getState().panelVisible).toBe(true)
		store.dismissPanel()
		expect(useConversationStore.getState().panelVisible).toBe(false)
	})

	it('reset clears everything', () => {
		const store = useConversationStore.getState()
		store.addUserTurn('hi')
		store.startAgentTurn()
		store.appendTextDelta('hey')
		store.reset()
		const state = useConversationStore.getState()
		expect(state.turns).toEqual([])
		expect(state.currentTurn).toBeNull()
		expect(state.status).toBe('idle')
		expect(state.panelVisible).toBe(false)
	})
})
