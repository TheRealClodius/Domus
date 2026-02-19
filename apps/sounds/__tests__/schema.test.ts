import { describe, expect, it } from 'vitest'
import { soundsApp } from '@/apps/sounds'
import { DEFAULT_SOUNDS_STATE, VOICES } from '@/apps/sounds/types'

const getSchema = soundsApp.getSchema as NonNullable<typeof soundsApp.getSchema>

describe('sounds getSchema', () => {
	const stoppedState = { ...DEFAULT_SOUNDS_STATE, playing: false } as Record<string, unknown>
	const playingState = { ...DEFAULT_SOUNDS_STATE, playing: true } as Record<string, unknown>

	it('returns 8 tools when stopped', () => {
		const schema = getSchema(stoppedState)
		expect(schema).toHaveLength(8)
	})

	it('returns 5 tools when playing', () => {
		const schema = getSchema(playingState)
		expect(schema).toHaveLength(5)
	})

	it('excludes toggle_step, clear_pattern, clear_all when playing', () => {
		const schema = getSchema(playingState)
		const names = schema.map((t) => t.name)
		expect(names).not.toContain('toggle_step')
		expect(names).not.toContain('clear_pattern')
		expect(names).not.toContain('clear_all')
	})

	it('includes toggle_step, clear_pattern, clear_all when stopped', () => {
		const schema = getSchema(stoppedState)
		const names = schema.map((t) => t.name)
		expect(names).toContain('toggle_step')
		expect(names).toContain('clear_pattern')
		expect(names).toContain('clear_all')
	})

	it('always includes transport and voice tools', () => {
		const alwaysTools = ['set_bpm', 'set_swing', 'toggle_play', 'toggle_mute', 'set_volume']
		for (const state of [stoppedState, playingState]) {
			const names = getSchema(state).map((t) => t.name)
			for (const tool of alwaysTools) {
				expect(names).toContain(tool)
			}
		}
	})

	it('every tool has valid MCP shape', () => {
		const schema = getSchema(stoppedState)
		for (const tool of schema) {
			expect(tool).toHaveProperty('name')
			expect(tool).toHaveProperty('description')
			expect(tool).toHaveProperty('inputSchema')
			expect(tool.inputSchema.type).toBe('object')
			expect(typeof tool.name).toBe('string')
			expect(typeof tool.description).toBe('string')
		}
	})

	it('voice params enumerate all voices', () => {
		const schema = getSchema(stoppedState)
		const toggleMute = schema.find((t) => t.name === 'toggle_mute')
		expect(toggleMute).toBeDefined()
		const props = toggleMute?.inputSchema.properties as Record<string, Record<string, unknown>>
		expect(props.voice.enum).toEqual([...VOICES])
	})

	it('every tool name has a matching case in reduce', () => {
		const schema = getSchema(stoppedState)
		for (const tool of schema) {
			const before = { ...DEFAULT_SOUNDS_STATE }
			const params: Record<string, unknown> = {}
			const props = (tool.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>
			for (const [key, prop] of Object.entries(props)) {
				if (Array.isArray(prop.enum)) {
					params[key] = prop.enum[0]
				} else if (prop.type === 'string') {
					params[key] = 'test'
				} else if (prop.type === 'number') {
					params[key] = 0
				}
			}
			const after = soundsApp.reduce(before as Record<string, unknown>, tool.name, params)
			expect(after).not.toBe(before)
		}
	})
})
