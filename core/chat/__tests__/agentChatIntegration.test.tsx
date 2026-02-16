// core/chat/__tests__/agentChatIntegration.test.tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AgentChat from '@/core/chat/AgentChat'
import { useConversationStore } from '@/core/chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'

function sseStream(events: Record<string, unknown>[]): ReadableStream<Uint8Array> {
	const raw = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('')
	return new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode(raw))
			controller.close()
		},
	})
}

vi.mock('@/core/chat/useAgentStream', async () => {
	const actual = await vi.importActual('@/core/chat/useAgentStream')
	return {
		...actual,
		sendMessage: vi.fn().mockResolvedValue(
			sseStream([
				{ type: 'tool_call_start', tool: 'create_entity', id: 'tc-1' },
				{
					type: 'tool_call_result',
					id: 'tc-1',
					result: {
						id: 'e-1',
						space_id: 'sp-1',
						user_id: 'u-1',
						type: 'note',
						presentation: 'card',
						position: { x: 50, y: 50, locked: false },
						size: { width: 236, height: 302 },
						z_index: 1,
						content: 'Grocery list',
						state: {},
						summary: 'Grocery list',
						created_by: 'agent',
						archived: false,
						created_at: '2026-01-01',
						updated_at: '2026-01-01',
					},
				},
				{ type: 'text_delta', content: 'Created your grocery list!' },
				{ type: 'done' },
			]),
		),
	}
})

describe('AgentChat integration', () => {
	afterEach(() => {
		cleanup()
		useConversationStore.getState().reset()
		useEntityStore.setState({ entities: {} })
	})

	it('full flow: send message, stream response, display turn, upsert entity', async () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)

		const textarea = screen.getByPlaceholderText('Message...')
		fireEvent.change(textarea, { target: { value: 'Make me a grocery list' } })
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

		// Wait for the SSE stream to be consumed
		await waitFor(() => {
			const state = useConversationStore.getState()
			expect(state.turns.length).toBeGreaterThanOrEqual(2)
		})

		// User message in store
		const state = useConversationStore.getState()
		expect(state.turns[0].role).toBe('user')
		expect(state.turns[0].text).toBe('Make me a grocery list')

		// Agent turn in store
		expect(state.turns[1].role).toBe('agent')
		expect(state.turns[1].text).toBe('Created your grocery list!')
		expect(state.turns[1].toolCalls).toHaveLength(1)

		// Entity was upserted
		const entity = useEntityStore.getState().entities['e-1']
		expect(entity).toBeDefined()
		expect(entity.type).toBe('note')
	})
})
