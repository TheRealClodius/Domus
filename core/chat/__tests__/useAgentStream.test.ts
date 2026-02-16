import { describe, expect, it } from 'vitest'

import { parseSSEEvent } from '@/core/chat/useAgentStream'

describe('parseSSEEvent', () => {
	it('parses text_delta event correctly', () => {
		const line = 'data: {"type":"text_delta","content":"hello"}'
		const result = parseSSEEvent(line)

		expect(result).toEqual({ type: 'text_delta', content: 'hello' })
	})

	it('parses tool_call_start event correctly', () => {
		const line = 'data: {"type":"tool_call_start","tool":"search","id":"tc-1"}'
		const result = parseSSEEvent(line)

		expect(result).toEqual({ type: 'tool_call_start', tool: 'search', id: 'tc-1' })
	})

	it('parses tool_call_result event correctly', () => {
		const line = 'data: {"type":"tool_call_result","id":"tc-1","result":{"items":["a","b"]}}'
		const result = parseSSEEvent(line)

		expect(result).toEqual({
			type: 'tool_call_result',
			id: 'tc-1',
			result: { items: ['a', 'b'] },
		})
	})

	it('parses done event correctly', () => {
		const line = 'data: {"type":"done"}'
		const result = parseSSEEvent(line)

		expect(result).toEqual({ type: 'done' })
	})

	it('parses error event correctly', () => {
		const line = 'data: {"type":"error","message":"rate limit exceeded"}'
		const result = parseSSEEvent(line)

		expect(result).toEqual({ type: 'error', message: 'rate limit exceeded' })
	})

	it('returns null for empty string', () => {
		const result = parseSSEEvent('')
		expect(result).toBeNull()
	})

	it('returns null for comment lines starting with :', () => {
		const result = parseSSEEvent(': this is a comment')
		expect(result).toBeNull()
	})

	it('returns null for lines without data: prefix', () => {
		const result = parseSSEEvent('event: message')
		expect(result).toBeNull()
	})

	it('returns null for malformed JSON after data: prefix', () => {
		const result = parseSSEEvent('data: {not valid json}')
		expect(result).toBeNull()
	})
})
