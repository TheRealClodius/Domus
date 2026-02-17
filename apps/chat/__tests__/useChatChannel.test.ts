import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatStore } from '@/apps/chat/chatStore'

// Mock the Supabase client before importing the hook
const mockChannel = {
	on: vi.fn().mockReturnThis(),
	subscribe: vi.fn().mockReturnThis(),
	send: vi.fn().mockResolvedValue('ok'),
	unsubscribe: vi.fn(),
}

const mockSupabase = {
	channel: vi.fn().mockReturnValue(mockChannel),
	removeChannel: vi.fn(),
}

vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => mockSupabase,
}))

// Import after mock setup
const { subscribeToChatChannel, broadcastTyping } = await import('@/apps/chat/useChatChannel')

beforeEach(() => {
	vi.clearAllMocks()
	useChatStore.getState().reset()
})

afterEach(() => {
	useChatStore.getState().reset()
})

describe('subscribeToChatChannel', () => {
	it('creates a channel for the group', () => {
		subscribeToChatChannel('g1')
		expect(mockSupabase.channel).toHaveBeenCalledWith('chat:g1')
	})

	it('subscribes to broadcast events', () => {
		subscribeToChatChannel('g1')
		expect(mockChannel.on).toHaveBeenCalledWith(
			'broadcast',
			{ event: 'message' },
			expect.any(Function),
		)
		expect(mockChannel.on).toHaveBeenCalledWith(
			'broadcast',
			{ event: 'typing' },
			expect.any(Function),
		)
	})

	it('calls subscribe on the channel', () => {
		subscribeToChatChannel('g1')
		expect(mockChannel.subscribe).toHaveBeenCalled()
	})

	it('returns an unsubscribe function', () => {
		const unsub = subscribeToChatChannel('g1')
		expect(typeof unsub).toBe('function')
		unsub()
		expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
	})

	it('routes message events to store.onMessage', () => {
		subscribeToChatChannel('g1')

		// Find the message handler from the on() calls
		const messageCall = mockChannel.on.mock.calls.find(
			(call: unknown[]) => (call[1] as { event: string }).event === 'message',
		)
		expect(messageCall).toBeDefined()

		const handler = messageCall[2] as (payload: { payload: unknown }) => void
		const msg = {
			id: 'm1',
			group_id: 'g1',
			user_id: 'u2',
			content: 'Hello',
			media_url: null,
			media_type: null,
			created_at: '2026-01-01T00:00:00Z',
			status: 'sent',
		}

		useChatStore.getState().setMessages('g1', [])
		handler({ payload: msg })

		expect(useChatStore.getState().messages.g1).toHaveLength(1)
		expect(useChatStore.getState().messages.g1[0].content).toBe('Hello')
	})

	it('routes typing events to store.onTyping', () => {
		subscribeToChatChannel('g1')

		const typingCall = mockChannel.on.mock.calls.find(
			(call: unknown[]) => (call[1] as { event: string }).event === 'typing',
		)
		expect(typingCall).toBeDefined()

		const handler = typingCall[2] as (payload: { payload: unknown }) => void
		handler({ payload: { user_id: 'u2' } })

		expect(useChatStore.getState().typingUsers.g1).toContain('u2')
	})
})

describe('broadcastTyping', () => {
	it('sends a typing event on the channel', () => {
		const unsub = subscribeToChatChannel('g1')
		broadcastTyping('g1', 'u1')
		expect(mockChannel.send).toHaveBeenCalledWith({
			type: 'broadcast',
			event: 'typing',
			payload: { user_id: 'u1' },
		})
		unsub()
	})

	it('throttles typing broadcasts', () => {
		vi.useFakeTimers()
		// Advance past any leftover throttle timestamp from previous test
		vi.advanceTimersByTime(3000)
		mockChannel.send.mockClear()

		const unsub = subscribeToChatChannel('g1')

		broadcastTyping('g1', 'u1')
		broadcastTyping('g1', 'u1')
		broadcastTyping('g1', 'u1')

		// Only the first call should go through (throttled)
		expect(mockChannel.send).toHaveBeenCalledTimes(1)

		vi.advanceTimersByTime(2000)
		broadcastTyping('g1', 'u1')
		expect(mockChannel.send).toHaveBeenCalledTimes(2)

		vi.useRealTimers()
		unsub()
	})
})
