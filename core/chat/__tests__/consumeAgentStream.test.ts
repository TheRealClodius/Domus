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
		expect(state.currentTurn).toBeNull()
		expect(state.error).toBeNull()
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

	it('sets error and preserves partial turn on error event', async () => {
		const stream = sseStream([
			{ type: 'text_delta', content: 'partial' },
			{ type: 'error', message: 'rate limit exceeded' },
		])

		await consumeAgentStream(stream)

		const state = useConversationStore.getState()
		expect(state.error).toBe('rate limit exceeded')
		// Partial turn is preserved in turns
		expect(state.currentTurn).toBeNull()
		expect(state.turns).toHaveLength(1)
		expect(state.turns[0].text).toBe('partial')
		expect(state.turns[0].summary).toBe('Error during response')
	})

	it('completes turn when stream ends without done event', async () => {
		const stream = sseStream([{ type: 'text_delta', content: 'Abrupt end' }])

		await consumeAgentStream(stream)

		const state = useConversationStore.getState()
		expect(state.currentTurn).toBeNull()
		expect(state.turns).toHaveLength(1)
		expect(state.turns[0].text).toBe('Abrupt end')
		expect(state.turns[0].summary).toBe('Abrupt end')
	})

	it('skips malformed SSE events mixed with valid ones', async () => {
		// Build a raw stream with a malformed event mixed in
		const raw = [
			'data: {"type":"text_delta","content":"Hello "}\n\n',
			'data: NOT_JSON\n\n',
			'data: {"type":"text_delta","content":"world"}\n\n',
			'data: {"type":"done"}\n\n',
		].join('')
		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode(raw))
				controller.close()
			},
		})

		await consumeAgentStream(stream)

		const state = useConversationStore.getState()
		expect(state.turns).toHaveLength(1)
		expect(state.turns[0].text).toBe('Hello world')
	})

	it('does not upsert non-entity tool results', async () => {
		const stream = sseStream([
			{ type: 'tool_call_start', tool: 'web_search', id: 'tc-1' },
			{ type: 'tool_call_result', id: 'tc-1', result: { items: ['a', 'b'] } },
			{ type: 'done' },
		])

		await consumeAgentStream(stream)

		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(0)
	})

	it('produces a clean partial turn when aborted mid-stream', async () => {
		const controller = new AbortController()

		// Pull-based stream: first pull returns data, second pull aborts then closes
		let pullCount = 0
		const stream = new ReadableStream<Uint8Array>({
			pull(ctrl) {
				pullCount++
				if (pullCount === 1) {
					ctrl.enqueue(
						new TextEncoder().encode('data: {"type":"text_delta","content":"Partial "}\n\n'),
					)
				} else {
					controller.abort()
					ctrl.close()
				}
			},
		})

		await consumeAgentStream(stream, controller.signal)

		const state = useConversationStore.getState()
		expect(state.currentTurn).toBeNull()
		expect(state.turns).toHaveLength(1)
		expect(state.turns[0].text).toBe('Partial ')
		expect(state.turns[0].summary).toBe('Cancelled')
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
