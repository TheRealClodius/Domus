import { describe, expect, it } from 'vitest'
import type {
	ChatAppState,
	ChatGroup,
	ChatMember,
	ChatMessage,
	ChatSidebarPanel,
} from '@/apps/chat/types'

describe('Chat types', () => {
	it('ChatGroup has required fields', () => {
		const group: ChatGroup = {
			id: 'g1',
			name: 'General',
			avatar_url: null,
			invite_code: 'abc123',
			created_by: 'u1',
			created_at: '2026-02-17T00:00:00Z',
		}
		expect(group.id).toBe('g1')
		expect(group.name).toBe('General')
		expect(group.avatar_url).toBeNull()
		expect(group.invite_code).toBe('abc123')
	})

	it('ChatMember has composite key fields', () => {
		const member: ChatMember = {
			group_id: 'g1',
			user_id: 'u1',
			role: 'owner',
			joined_at: '2026-02-17T00:00:00Z',
			last_read_at: '2026-02-17T00:00:00Z',
		}
		expect(member.group_id).toBe('g1')
		expect(member.role).toBe('owner')
	})

	it('ChatMember role is owner or member', () => {
		const owner: ChatMember = {
			group_id: 'g1',
			user_id: 'u1',
			role: 'owner',
			joined_at: '2026-02-17T00:00:00Z',
			last_read_at: null,
		}
		const member: ChatMember = {
			group_id: 'g1',
			user_id: 'u2',
			role: 'member',
			joined_at: '2026-02-17T00:00:00Z',
			last_read_at: null,
		}
		expect(owner.role).toBe('owner')
		expect(member.role).toBe('member')
	})

	it('ChatMessage supports optional media', () => {
		const textOnly: ChatMessage = {
			id: 'm1',
			group_id: 'g1',
			user_id: 'u1',
			content: 'Hello',
			media_url: null,
			media_type: null,
			created_at: '2026-02-17T00:00:00Z',
			status: 'sent',
		}
		expect(textOnly.media_url).toBeNull()

		const withMedia: ChatMessage = {
			id: 'm2',
			group_id: 'g1',
			user_id: 'u1',
			content: 'Check this out',
			media_url: 'https://example.com/image.png',
			media_type: 'image/png',
			created_at: '2026-02-17T00:00:00Z',
			status: 'sent',
		}
		expect(withMedia.media_url).toBe('https://example.com/image.png')
		expect(withMedia.media_type).toBe('image/png')
	})

	it('ChatMessage has optimistic status field', () => {
		const pending: ChatMessage = {
			id: 'm1',
			group_id: 'g1',
			user_id: 'u1',
			content: 'Sending...',
			media_url: null,
			media_type: null,
			created_at: '2026-02-17T00:00:00Z',
			status: 'pending',
		}
		const failed: ChatMessage = { ...pending, status: 'failed' }
		expect(pending.status).toBe('pending')
		expect(failed.status).toBe('failed')
	})

	it('ChatSidebarPanel is groups, settings, or null', () => {
		const panels: ChatSidebarPanel[] = ['groups', 'settings', null]
		expect(panels).toHaveLength(3)
		expect(panels).toContain('groups')
		expect(panels).toContain('settings')
		expect(panels).toContain(null)
	})

	it('ChatAppState has required shape', () => {
		const state: ChatAppState = {
			active_group_id: 'g1',
			sidebar: 'groups',
		}
		expect(state.active_group_id).toBe('g1')
		expect(state.sidebar).toBe('groups')

		const empty: ChatAppState = {
			active_group_id: null,
			sidebar: null,
		}
		expect(empty.active_group_id).toBeNull()
		expect(empty.sidebar).toBeNull()
	})
})
