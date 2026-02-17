import { describe, expect, it, vi } from 'vitest'

import {
	fileToBase64,
	parseSSEEvent,
	sendMessage,
	serializeContextItems,
} from '@/core/chat/useAgentStream'
import type { ContextItem } from '@/core/chat/usePromptInputState'

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

describe('fileToBase64', () => {
	it('converts a File to a base64 data URL string', async () => {
		const file = new File(['hello world'], 'test.txt', { type: 'text/plain' })
		const result = await fileToBase64(file)

		expect(result).toMatch(/^data:text\/plain;base64,/)
		// 'hello world' in base64 is 'aGVsbG8gd29ybGQ='
		expect(result).toBe('data:text/plain;base64,aGVsbG8gd29ybGQ=')
	})

	it('handles an image file', async () => {
		const bytes = new Uint8Array([137, 80, 78, 71]) // PNG magic bytes
		const file = new File([bytes], 'image.png', { type: 'image/png' })
		const result = await fileToBase64(file)

		expect(result).toMatch(/^data:image\/png;base64,/)
	})
})

describe('serializeContextItems', () => {
	it('filters out items that are not ready', async () => {
		const items: ContextItem[] = [
			{
				id: '1',
				file: new File(['a'], 'a.txt', { type: 'text/plain' }),
				name: 'a.txt',
				type: 'document',
				status: 'ready',
			},
			{
				id: '2',
				file: new File(['b'], 'b.txt', { type: 'text/plain' }),
				name: 'b.txt',
				type: 'document',
				status: 'loading',
			},
			{
				id: '3',
				file: new File(['c'], 'c.txt', { type: 'text/plain' }),
				name: 'c.txt',
				type: 'document',
				status: 'error',
				error: 'failed',
			},
		]

		const result = await serializeContextItems(items)
		expect(result).toHaveLength(1)
		expect(result[0].name).toBe('a.txt')
	})

	it('converts ready items to serialized form with base64 data', async () => {
		const items: ContextItem[] = [
			{
				id: 'img-1',
				file: new File(['pixels'], 'photo.png', { type: 'image/png' }),
				name: 'photo.png',
				type: 'image',
				status: 'ready',
			},
		]

		const result = await serializeContextItems(items)
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({
			id: 'img-1',
			name: 'photo.png',
			type: 'image',
			data: expect.stringMatching(/^data:image\/png;base64,/),
		})
	})

	it('returns an empty array when given no items', async () => {
		const result = await serializeContextItems([])
		expect(result).toEqual([])
	})

	it('returns an empty array when all items are non-ready', async () => {
		const items: ContextItem[] = [
			{
				id: '1',
				file: new File(['x'], 'x.txt', { type: 'text/plain' }),
				name: 'x.txt',
				type: 'document',
				status: 'loading',
			},
		]
		const result = await serializeContextItems(items)
		expect(result).toEqual([])
	})

	it('small files pass through unchanged', async () => {
		const items: ContextItem[] = [
			{
				id: '1',
				file: new File(['small content'], 'small.txt', { type: 'text/plain' }),
				name: 'small.txt',
				type: 'document',
				status: 'ready',
			},
		]
		const result = await serializeContextItems(items)
		expect(result).toHaveLength(1)
		expect(result[0].name).toBe('small.txt')
		expect(result[0].data).toMatch(/^data:text\/plain;base64,/)
	})

	it('filters out files > 10MB', async () => {
		// Create a file just over 10 MB
		const bigBuffer = new ArrayBuffer(10 * 1024 * 1024 + 1)
		const bigFile = new File([bigBuffer], 'huge.bin', { type: 'application/octet-stream' })
		const smallFile = new File(['ok'], 'small.txt', { type: 'text/plain' })

		const items: ContextItem[] = [
			{ id: 'big', file: bigFile, name: 'huge.bin', type: 'document', status: 'ready' },
			{ id: 'small', file: smallFile, name: 'small.txt', type: 'document', status: 'ready' },
		]

		const result = await serializeContextItems(items)
		expect(result).toHaveLength(1)
		expect(result[0].name).toBe('small.txt')
	})

	it('throws when total serialized payload > 25MB', async () => {
		// Create several files that are each under 10MB but together exceed 25MB serialized
		const items: ContextItem[] = []
		for (let i = 0; i < 4; i++) {
			const buf = new ArrayBuffer(7 * 1024 * 1024) // 7 MB each, base64 grows ~33%
			items.push({
				id: `f-${i}`,
				file: new File([buf], `file-${i}.bin`, { type: 'application/octet-stream' }),
				name: `file-${i}.bin`,
				type: 'document',
				status: 'ready',
			})
		}

		await expect(serializeContextItems(items)).rejects.toThrow('Total payload exceeds 25 MB limit')
	})
})

describe('sendMessage', () => {
	it('sends all context fields in the request body', async () => {
		const mockBody = new ReadableStream()
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(mockBody, { status: 200 }))

		await sendMessage({
			spaceId: 'space-1',
			userId: 'user-1',
			message: 'hello',
			viewport: { width: 1920, height: 1080 },
			focusedEntityId: 'entity-42',
			visibleEntityIds: ['entity-42', 'entity-99'],
			contextItems: [
				{ id: 'ci-1', name: 'file.png', type: 'image', data: 'data:image/png;base64,abc' },
			],
		})

		expect(fetchSpy).toHaveBeenCalledOnce()
		const [url, options] = fetchSpy.mock.calls[0]
		expect(url).toBe('/api/agent')

		const body = JSON.parse(options?.body as string)
		expect(body.space_id).toBe('space-1')
		expect(body.user_id).toBe('user-1')
		expect(body.message).toBe('hello')
		expect(body.viewport).toEqual({ width: 1920, height: 1080 })
		expect(body.focused_entity_id).toBe('entity-42')
		expect(body.visible_entity_ids).toEqual(['entity-42', 'entity-99'])
		expect(body.context_items).toEqual([
			{ id: 'ci-1', name: 'file.png', type: 'image', data: 'data:image/png;base64,abc' },
		])

		fetchSpy.mockRestore()
	})

	it('sends defaults when optional context fields are omitted', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(new ReadableStream(), { status: 200 }))

		await sendMessage({
			spaceId: 'space-1',
			userId: 'user-1',
			message: 'hi',
		})

		const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
		expect(body.viewport).toEqual({})
		expect(body.focused_entity_id).toBeNull()
		expect(body.visible_entity_ids).toEqual([])
		expect(body.context_items).toEqual([])

		fetchSpy.mockRestore()
	})
})
