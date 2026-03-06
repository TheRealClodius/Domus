import { describe, expect, it } from 'vitest'
import { chatApp } from '@/apps/chat'
import { DEFAULT_CHAT_STATE } from '@/apps/chat/types'

describe('chatApp registration', () => {
	it('has correct metadata', () => {
		expect(chatApp.type).toBe('chat')
		expect(chatApp.name).toBe('Chat')
		expect(chatApp.source).toBe('built-in')
		expect(chatApp.defaultPresentation).toBe('window')
		expect(chatApp.maxInstances).toBe(1)
	})

	it('has default size', () => {
		expect(chatApp.defaultSize).toEqual({ width: 400, height: 500 })
	})

	describe('reduce', () => {
		it('handles set_active_group', () => {
			const state = chatApp.reduce({}, 'set_active_group', { group_id: 'g1' })
			expect(state).toEqual({
				...DEFAULT_CHAT_STATE,
				active_group_id: 'g1',
			})
		})

		it('handles set_sidebar', () => {
			const state = chatApp.reduce({}, 'set_sidebar', { sidebar: 'groups' })
			expect(state).toEqual({
				...DEFAULT_CHAT_STATE,
				sidebar: 'groups',
			})
		})

		it('returns state for unknown actions', () => {
			const original = { foo: 'bar' }
			const state = chatApp.reduce(original, 'unknown', {})
			expect(state).toBe(original)
		})

		it('preserves existing state fields', () => {
			const existing = { active_group_id: 'g1', sidebar: 'groups' as const }
			const state = chatApp.reduce(existing as Record<string, unknown>, 'set_active_group', {
				group_id: 'g2',
			})
			expect(state).toEqual({ active_group_id: 'g2', sidebar: 'groups' })
		})
	})

	describe('getSchema', () => {
		it('returns exactly 8 tools', () => {
			const schema = chatApp.getSchema?.({})
			expect(schema).toHaveLength(9)
		})

		it('each tool has name, description, and inputSchema', () => {
			const schema = chatApp.getSchema?.({})
			for (const tool of schema ?? []) {
				expect(tool).toHaveProperty('name')
				expect(tool).toHaveProperty('description')
				expect(tool).toHaveProperty('inputSchema')
			}
		})

		it('includes all expected tool names', () => {
			const schema = chatApp.getSchema?.({})
			const names = (schema ?? []).map((t) => t.name)
			expect(names).toContain('list_groups')
			expect(names).toContain('list_messages')
			expect(names).toContain('get_group_summary')
			expect(names).toContain('search_messages')
			expect(names).toContain('set_active_group')
			expect(names).toContain('send_message')
			expect(names).toContain('delete_group')
			expect(names).toContain('create_group')
			expect(names).toContain('send_image')
		})

		it('set_active_group is handled by reduce', () => {
			const state = chatApp.reduce({}, 'set_active_group', { group_id: 'g1' })
			expect(state).toMatchObject({ active_group_id: 'g1' })
		})

		it('data tools return state unchanged from reduce', () => {
			const original = { active_group_id: 'g1', sidebar: null }
			for (const toolName of [
				'list_groups',
				'list_messages',
				'get_group_summary',
				'search_messages',
			]) {
				const state = chatApp.reduce(original as Record<string, unknown>, toolName, {})
				expect(state).toBe(original)
			}
		})

		it('is state-independent (returns same tools regardless of state)', () => {
			const schema1 = chatApp.getSchema?.({})
			const schema2 = chatApp.getSchema?.({ active_group_id: 'g1', sidebar: null })
			expect((schema1 ?? []).map((t) => t.name)).toEqual((schema2 ?? []).map((t) => t.name))
		})
	})

	describe('summarize', () => {
		it('returns "Chat" when no active group', () => {
			expect(chatApp.summarize({})).toBe('Chat')
		})

		it('returns "Chat — active" when group is selected', () => {
			expect(chatApp.summarize({ active_group_id: 'g1', sidebar: null })).toBe('Chat — active')
		})
	})
})
