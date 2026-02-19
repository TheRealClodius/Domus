import { describe, expect, it } from 'vitest'
import { calendarApp } from '@/apps/calendar'
import { DEFAULT_CALENDAR_STATE } from '@/apps/calendar/types'

const getSchema = calendarApp.getSchema as NonNullable<typeof calendarApp.getSchema>

describe('calendar getSchema', () => {
	const schema = getSchema(DEFAULT_CALENDAR_STATE as Record<string, unknown>)

	it('returns exactly 2 tools', () => {
		expect(schema).toHaveLength(2)
	})

	it('includes set_view and set_date', () => {
		const names = schema.map((t) => t.name)
		expect(names).toEqual(['set_view', 'set_date'])
	})

	it('every tool has valid MCP shape', () => {
		for (const tool of schema) {
			expect(tool).toHaveProperty('name')
			expect(tool).toHaveProperty('description')
			expect(tool).toHaveProperty('inputSchema')
			expect(tool.inputSchema.type).toBe('object')
			expect(typeof tool.name).toBe('string')
			expect(typeof tool.description).toBe('string')
		}
	})

	it('set_view enumerates all calendar views', () => {
		const setView = schema.find((t) => t.name === 'set_view')
		expect(setView).toBeDefined()
		const props = setView?.inputSchema.properties as Record<string, Record<string, unknown>>
		expect(props.view.enum).toEqual(['month', 'week', 'day', 'agenda'])
	})

	it('schema is static — same tools regardless of state', () => {
		const weekState = { view: 'week', selected_date: '2026-03-01' }
		const weekSchema = getSchema(weekState)
		expect(weekSchema.map((t) => t.name)).toEqual(schema.map((t) => t.name))
	})

	it('every tool name has a matching case in reduce', () => {
		for (const tool of schema) {
			const before = { ...DEFAULT_CALENDAR_STATE }
			const params: Record<string, unknown> = {}
			const props = (tool.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>
			for (const [key, prop] of Object.entries(props)) {
				if (Array.isArray(prop.enum)) {
					params[key] = prop.enum[0]
				} else if (prop.type === 'string') {
					params[key] = '2026-01-15'
				} else if (prop.type === 'number') {
					params[key] = 1
				}
			}
			const after = calendarApp.reduce(before as Record<string, unknown>, tool.name, params)
			expect(after).not.toBe(before)
		}
	})
})
