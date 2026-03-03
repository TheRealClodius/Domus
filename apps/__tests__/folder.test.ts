import { describe, expect, it } from 'vitest'

// Import will fail until the module exists — that's intentional (TDD)
import { folderApp } from '@/apps/folder'

describe('Folder getSchema', () => {
	it('returns 3 tools when folder has children', () => {
		const schema = folderApp.getSchema?.({ child_ids: ['a', 'b'] }) ?? []
		expect(schema).toHaveLength(3)
		const names = schema.map((t) => t.name)
		expect(names).toContain('add_children')
		expect(names).toContain('remove_child')
		expect(names).toContain('scatter')
	})

	it('omits remove_child when child_ids is empty', () => {
		const schema = folderApp.getSchema?.({ child_ids: [] }) ?? []
		expect(schema).toHaveLength(2)
		const names = schema.map((t) => t.name)
		expect(names).toContain('add_children')
		expect(names).not.toContain('remove_child')
		expect(names).toContain('scatter')
	})

	it('omits remove_child when child_ids is absent', () => {
		const schema = folderApp.getSchema?.({}) ?? []
		expect(schema).toHaveLength(2)
		const names = schema.map((t) => t.name)
		expect(names).not.toContain('remove_child')
	})

	it('add_children requires child_ids array with minItems 1', () => {
		const schema = folderApp.getSchema?.({}) ?? []
		const tool = schema.find((t) => t.name === 'add_children')
		expect(tool).toBeDefined()
		expect(tool?.inputSchema.properties).toMatchObject({
			child_ids: expect.objectContaining({ type: 'array', minItems: 1 }),
		})
		expect(tool?.inputSchema.required as string[]).toContain('child_ids')
	})

	it('remove_child requires child_id string', () => {
		const schema = folderApp.getSchema?.({ child_ids: ['x'] }) ?? []
		const tool = schema.find((t) => t.name === 'remove_child')
		expect(tool).toBeDefined()
		expect(tool?.inputSchema.properties).toMatchObject({
			child_id: expect.objectContaining({ type: 'string' }),
		})
		expect(tool?.inputSchema.required as string[]).toContain('child_id')
	})
})

describe('Folder reduce', () => {
	it('add_children appends ids and deduplicates', () => {
		const state = { child_ids: ['a'] }
		const result = folderApp.reduce(state, 'add_children', { child_ids: ['b', 'a', 'c'] })
		expect(result.child_ids).toEqual(['a', 'b', 'c'])
	})

	it('add_children works on empty initial state', () => {
		const result = folderApp.reduce({}, 'add_children', { child_ids: ['x'] })
		expect(result.child_ids).toEqual(['x'])
	})

	it('remove_child filters out the given id', () => {
		const state = { child_ids: ['a', 'b', 'c'] }
		const result = folderApp.reduce(state, 'remove_child', { child_id: 'b' })
		expect(result.child_ids).toEqual(['a', 'c'])
	})

	it('remove_child on missing id leaves list unchanged', () => {
		const state = { child_ids: ['a', 'b'] }
		const result = folderApp.reduce(state, 'remove_child', { child_id: 'z' })
		expect(result.child_ids).toEqual(['a', 'b'])
	})

	it('scatter returns child_ids: []', () => {
		const state = { child_ids: ['a', 'b', 'c'] }
		const result = folderApp.reduce(state, 'scatter', {})
		expect(result.child_ids).toEqual([])
	})

	it('unknown action returns state unchanged', () => {
		const state = { child_ids: ['a'] }
		const result = folderApp.reduce(state, 'unknown_action', {})
		expect(result).toBe(state)
	})
})

describe('Folder summarize', () => {
	it('returns "Empty folder" for 0 children', () => {
		expect(folderApp.summarize({ child_ids: [] })).toBe('Empty folder')
	})

	it('returns "Empty folder" when child_ids is absent', () => {
		expect(folderApp.summarize({})).toBe('Empty folder')
	})

	it('returns "1 item" for 1 child', () => {
		expect(folderApp.summarize({ child_ids: ['a'] })).toBe('1 item')
	})

	it('returns "N items" for N > 1 children', () => {
		expect(folderApp.summarize({ child_ids: ['a', 'b', 'c'] })).toBe('3 items')
	})
})

describe('Folder app definition', () => {
	it('has correct type and source', () => {
		expect(folderApp.type).toBe('folder')
		expect(folderApp.source).toBe('built-in')
	})

	it('has defaultPresentation: folder', () => {
		expect(folderApp.defaultPresentation).toBe('folder')
	})

	it('has correct default size', () => {
		expect(folderApp.defaultSize).toEqual({ width: 120, height: 120 })
	})
})
