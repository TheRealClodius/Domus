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
			const state = chatApp.reduce(
				existing as Record<string, unknown>,
				'set_active_group',
				{ group_id: 'g2' },
			)
			expect(state).toEqual({ active_group_id: 'g2', sidebar: 'groups' })
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
