import { afterEach, describe, expect, it } from 'vitest'
import { consumeAgentStream } from '@/core/chat/consumeAgentStream'
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

describe('consumeAgentStream', () => {
	afterEach(() => {
		useConversationStore.getState().reset()
		useEntityStore.setState({ entities: {} })
	})

	it('processes text_delta events into conversation store', async () => {
		const stream = sseStream([
			{ type: 'text_delta', content: 'Hello ' },
			{ type: 'text_delta', content: 'world' },
			{ type: 'done' },
		])

		await consumeAgentStream(stream)

		const state = useConversationStore.getState()
		expect(state.turns).toHaveLength(1)
		expect(state.turns[0].text).toBe('Hello world')
		expect(state.status).toBe('idle')
	})

	it('processes tool_call_start and tool_call_result events', async () => {
		const stream = sseStream([
			{ type: 'tool_call_start', tool: 'create_entity', id: 'tc-1' },
			{
				type: 'tool_call_result',
				id: 'tc-1',
				result: { id: 'e-1', type: 'note', summary: 'A note' },
			},
			{ type: 'done' },
		])

		await consumeAgentStream(stream)

		const state = useConversationStore.getState()
		const turn = state.turns[0]
		expect(turn.toolCalls).toHaveLength(1)
		expect(turn.toolCalls[0].status).toBe('done')
		expect(turn.toolCalls[0].result).toEqual({ id: 'e-1', type: 'note', summary: 'A note' })
	})

	it('upserts entity from tool_call_result with entity-shaped result', async () => {
		const entityPayload = {
			id: 'e-1',
			space_id: 'sp-1',
			user_id: 'u-1',
			type: 'note',
			presentation: 'card',
			position: { x: 50, y: 50, locked: false },
			size: { width: 236, height: 302 },
			z_index: 1,
			content: 'hello',
			state: {},
			summary: 'A note',
			created_by: 'agent',
			archived: false,
			created_at: '2026-01-01',
			updated_at: '2026-01-01',
		}

		const stream = sseStream([
			{ type: 'tool_call_start', tool: 'create_entity', id: 'tc-1' },
			{ type: 'tool_call_result', id: 'tc-1', result: entityPayload },
			{ type: 'done' },
		])

		await consumeAgentStream(stream)

		const entity = useEntityStore.getState().entities['e-1']
		expect(entity).toBeDefined()
		expect(entity.type).toBe('note')
		expect(entity.presentation).toBe('card')
	})

	it('sets error status on error event', async () => {
		const stream = sseStream([
			{ type: 'text_delta', content: 'partial' },
			{ type: 'error', message: 'rate limit exceeded' },
		])

		await consumeAgentStream(stream)

		const state = useConversationStore.getState()
		expect(state.status).toBe('error')
		expect(state.error).toBe('rate limit exceeded')
	})

	it('handles multiple tool calls in a single turn', async () => {
		const stream = sseStream([
			{ type: 'tool_call_start', tool: 'create_entity', id: 'tc-1' },
			{ type: 'tool_call_result', id: 'tc-1', result: { id: 'e-1' } },
			{ type: 'tool_call_start', tool: 'query_entities', id: 'tc-2' },
			{ type: 'tool_call_result', id: 'tc-2', result: { items: [] } },
			{ type: 'text_delta', content: 'Done!' },
			{ type: 'done' },
		])

		await consumeAgentStream(stream)

		const turn = useConversationStore.getState().turns[0]
		expect(turn.toolCalls).toHaveLength(2)
		expect(turn.text).toBe('Done!')
	})
})
