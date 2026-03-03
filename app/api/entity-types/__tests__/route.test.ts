import { describe, expect, it } from 'vitest'
import { GET } from '../route'

describe('GET /api/entity-types', () => {
	it('returns all built-in types', async () => {
		const res = await GET()
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(Array.isArray(json)).toBe(true)
		expect(json.length).toBeGreaterThan(0)
	})

	it('includes folder with initialState and description', async () => {
		const res = await GET()
		const json = await res.json()

		const folder = json.find((t: { type: string }) => t.type === 'folder')
		expect(folder).toBeDefined()
		expect(folder.initialState).toEqual({ child_ids: [] })
		expect(typeof folder.description).toBe('string')
		expect(folder.description.length).toBeGreaterThan(0)
	})

	it('every type has required fields', async () => {
		const res = await GET()
		const json = await res.json()

		for (const t of json) {
			expect(typeof t.type).toBe('string')
			expect(typeof t.name).toBe('string')
			expect(typeof t.description).toBe('string')
			expect(typeof t.defaultPresentation).toBe('string')
			expect(typeof t.defaultSize.width).toBe('number')
			expect(typeof t.defaultSize.height).toBe('number')
			expect(typeof t.initialState).toBe('object')
		}
	})

	it('maxInstances is null or a number', async () => {
		const res = await GET()
		const json = await res.json()

		for (const t of json) {
			expect(t.maxInstances === null || typeof t.maxInstances === 'number').toBe(true)
		}
	})
})
