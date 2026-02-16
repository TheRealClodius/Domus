import { describe, expect, it } from 'vitest'
import type { AgentSSEEvent } from '@/core/chat/agentStreamTypes'

describe('AgentSSEEvent types', () => {
	it('narrows text_delta event', () => {
		const event: AgentSSEEvent = { type: 'text_delta', content: 'hello' }
		if (event.type === 'text_delta') {
			const text: string = event.content
			expect(text).toBe('hello')
		}
	})

	it('narrows tool_call_start event', () => {
		const event: AgentSSEEvent = { type: 'tool_call_start', tool: 'create_entity', id: 'tc-1' }
		if (event.type === 'tool_call_start') {
			expect(event.tool).toBe('create_entity')
			expect(event.id).toBe('tc-1')
		}
	})

	it('narrows tool_call_result event', () => {
		const event: AgentSSEEvent = {
			type: 'tool_call_result',
			id: 'tc-1',
			result: { id: 'entity-1', type: 'note' },
		}
		if (event.type === 'tool_call_result') {
			expect(event.result).toEqual({ id: 'entity-1', type: 'note' })
		}
	})

	it('narrows done event', () => {
		const event: AgentSSEEvent = { type: 'done' }
		if (event.type === 'done') {
			expect(event.type).toBe('done')
		}
	})

	it('narrows error event', () => {
		const event: AgentSSEEvent = { type: 'error', message: 'rate limit' }
		if (event.type === 'error') {
			expect(event.message).toBe('rate limit')
		}
	})
})
