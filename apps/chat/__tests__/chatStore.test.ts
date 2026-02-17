import { afterEach, describe, expect, it, vi } from 'vitest'
import { useChatStore } from '@/apps/chat/chatStore'
import type { ChatGroup, ChatMessage } from '@/apps/chat/types'

function makeGroup(overrides: Partial<ChatGroup> = {}): ChatGroup {
	return {
		id: 'g1',
		name: 'General',
		avatar_url: null,
		invite_code: 'abc123',
		created_by: 'u1',
		created_at: '2026-01-01T00:00:00Z',
		...overrides,
	}
}

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
	return {
		id: 'm1',
		group_id: 'g1',
		user_id: 'u1',
		content: 'Hello',
		media_url: null,
		media_type: null,
		created_at: '2026-01-01T00:00:00Z',
		status: 'sent',
		...overrides,
	}
}

afterEach(() => {
	useChatStore.getState().reset()
	vi.restoreAllMocks()
})

describe('initial state', () => {
	it('starts with empty groups and messages', () => {
		const s = useChatStore.getState()
		expect(s.groups).toEqual([])
		expect(s.messages).toEqual({})
		expect(s.unreadCounts).toEqual({})
		expect(s.typingUsers).toEqual({})
		expect(s.activeGroupId).toBeNull()
		expect(s.sidebar).toBeNull()
	})
})

describe('setActiveGroup', () => {
	it('sets the active group id', () => {
		useChatStore.getState().setActiveGroup('g1')
		expect(useChatStore.getState().activeGroupId).toBe('g1')
	})

	it('resets unread count for the group', () => {
		useChatStore.setState({ unreadCounts: { g1: 5 } })
		useChatStore.getState().setActiveGroup('g1')
		expect(useChatStore.getState().unreadCounts.g1).toBe(0)
	})
})

describe('setSidebar', () => {
	it('sets sidebar panel', () => {
		useChatStore.getState().setSidebar('groups')
		expect(useChatStore.getState().sidebar).toBe('groups')
	})

	it('clears sidebar with null', () => {
		useChatStore.getState().setSidebar('groups')
		useChatStore.getState().setSidebar(null)
		expect(useChatStore.getState().sidebar).toBeNull()
	})
})

describe('setGroups', () => {
	it('replaces groups list', () => {
		const groups = [makeGroup(), makeGroup({ id: 'g2', name: 'Random' })]
		useChatStore.getState().setGroups(groups)
		expect(useChatStore.getState().groups).toHaveLength(2)
	})
})

describe('setMessages', () => {
	it('sets messages for a group', () => {
		const msgs = [makeMessage(), makeMessage({ id: 'm2', content: 'World' })]
		useChatStore.getState().setMessages('g1', msgs)
		expect(useChatStore.getState().messages.g1).toHaveLength(2)
	})
})

describe('prependMessages', () => {
	it('prepends older messages for pagination', () => {
		const existing = [makeMessage({ id: 'm2', content: 'Second' })]
		useChatStore.getState().setMessages('g1', existing)

		const older = [makeMessage({ id: 'm1', content: 'First' })]
		useChatStore.getState().prependMessages('g1', older)

		const msgs = useChatStore.getState().messages.g1
		expect(msgs).toHaveLength(2)
		expect(msgs[0].id).toBe('m1')
		expect(msgs[1].id).toBe('m2')
	})
})

describe('addOptimisticMessage', () => {
	it('appends a pending message to group', () => {
		useChatStore.getState().setMessages('g1', [])
		const msg = makeMessage({ id: 'temp-1', status: 'pending' })
		useChatStore.getState().addOptimisticMessage('g1', msg)
		const msgs = useChatStore.getState().messages.g1
		expect(msgs).toHaveLength(1)
		expect(msgs[0].status).toBe('pending')
	})
})

describe('confirmMessage', () => {
	it('replaces optimistic message with confirmed one', () => {
		const optimistic = makeMessage({ id: 'temp-1', status: 'pending' })
		useChatStore.getState().setMessages('g1', [optimistic])

		const confirmed = makeMessage({ id: 'real-1', status: 'sent' })
		useChatStore.getState().confirmMessage('g1', 'temp-1', confirmed)

		const msgs = useChatStore.getState().messages.g1
		expect(msgs).toHaveLength(1)
		expect(msgs[0].id).toBe('real-1')
		expect(msgs[0].status).toBe('sent')
	})
})

describe('failMessage', () => {
	it('marks an optimistic message as failed', () => {
		const optimistic = makeMessage({ id: 'temp-1', status: 'pending' })
		useChatStore.getState().setMessages('g1', [optimistic])

		useChatStore.getState().failMessage('g1', 'temp-1')

		const msgs = useChatStore.getState().messages.g1
		expect(msgs[0].status).toBe('failed')
	})
})

describe('onMessage', () => {
	it('appends message to active group', () => {
		useChatStore.getState().setActiveGroup('g1')
		useChatStore.getState().setMessages('g1', [])

		const msg = makeMessage()
		useChatStore.getState().onMessage('g1', msg)

		expect(useChatStore.getState().messages.g1).toHaveLength(1)
	})

	it('increments unread for non-active group', () => {
		useChatStore.getState().setActiveGroup('g2')
		useChatStore.getState().setMessages('g1', [])

		const msg = makeMessage()
		useChatStore.getState().onMessage('g1', msg)

		expect(useChatStore.getState().unreadCounts.g1).toBe(1)
	})

	it('does not increment unread for active group', () => {
		useChatStore.getState().setActiveGroup('g1')
		useChatStore.getState().setMessages('g1', [])

		const msg = makeMessage()
		useChatStore.getState().onMessage('g1', msg)

		expect(useChatStore.getState().unreadCounts.g1 ?? 0).toBe(0)
	})
})

describe('onTyping', () => {
	it('adds user to typing list', () => {
		useChatStore.getState().onTyping('g1', 'u2')
		expect(useChatStore.getState().typingUsers.g1).toContain('u2')
	})

	it('does not duplicate users', () => {
		useChatStore.getState().onTyping('g1', 'u2')
		useChatStore.getState().onTyping('g1', 'u2')
		expect(useChatStore.getState().typingUsers.g1).toHaveLength(1)
	})

	it('clears user after timeout', async () => {
		vi.useFakeTimers()
		useChatStore.getState().onTyping('g1', 'u2')
		expect(useChatStore.getState().typingUsers.g1).toContain('u2')

		vi.advanceTimersByTime(3000)
		expect(useChatStore.getState().typingUsers.g1 ?? []).not.toContain('u2')
		vi.useRealTimers()
	})
})

describe('markRead', () => {
	it('resets unread count for group', () => {
		useChatStore.setState({ unreadCounts: { g1: 3 } })
		useChatStore.getState().markRead('g1')
		expect(useChatStore.getState().unreadCounts.g1).toBe(0)
	})
})

describe('reset', () => {
	it('restores initial state', () => {
		useChatStore.getState().setActiveGroup('g1')
		useChatStore.getState().setSidebar('groups')
		useChatStore.getState().setGroups([makeGroup()])

		useChatStore.getState().reset()

		const s = useChatStore.getState()
		expect(s.groups).toEqual([])
		expect(s.activeGroupId).toBeNull()
		expect(s.sidebar).toBeNull()
	})
})
