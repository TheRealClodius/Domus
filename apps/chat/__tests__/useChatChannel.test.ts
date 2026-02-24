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
const mod = await import('@/apps/chat/useChatChannel')
const { subscribeToActiveGroup, broadcastTyping, unsubscribeAll } = mod

beforeEach(() => {
	vi.clearAllMocks()
	unsubscribeAll()
	useChatStore.getState().reset()
})

afterEach(() => {
	unsubscribeAll()
	useChatStore.getState().reset()
})

describe('subscribeToActiveGroup', () => {
	it('creates a channel for the group', () => {
		subscribeToActiveGroup('g1')
		expect(mockSupabase.channel).toHaveBeenCalledWith('chat:g1')
	})

	it('creates a postgres_changes subscription for messages', () => {
		subscribeToActiveGroup('g1')
		expect(mockChannel.on).toHaveBeenCalledWith(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'chat_messages',
				filter: 'group_id=eq.g1',
			},
			expect.any(Function),
		)
	})

	it('does NOT create a broadcast subscription for messages', () => {
		subscribeToActiveGroup('g1')
		const broadcastMessageCall = mockChannel.on.mock.calls.find(
			(call: unknown[]) =>
				call[0] === 'broadcast' && (call[1] as { event: string }).event === 'message',
		)
		expect(broadcastMessageCall).toBeUndefined()
	})

	it('still subscribes to broadcast for typing', () => {
		subscribeToActiveGroup('g1')
		expect(mockChannel.on).toHaveBeenCalledWith(
			'broadcast',
			{ event: 'typing' },
			expect.any(Function),
		)
	})

	it('calls subscribe on the channel', () => {
		subscribeToActiveGroup('g1')
		expect(mockChannel.subscribe).toHaveBeenCalled()
	})

	it('returns an unsubscribe function', () => {
		const unsub = subscribeToActiveGroup('g1')
		expect(typeof unsub).toBe('function')
		unsub()
		expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
	})

	it('unsubscribes previous channel when switching groups', () => {
		subscribeToActiveGroup('g1')
		subscribeToActiveGroup('g2')
		// Should have removed the g1 channel before subscribing to g2
		expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel)
		expect(mockSupabase.channel).toHaveBeenCalledWith('chat:g2')
	})

	it('postgres_changes INSERT event routes to store.onMessage', () => {
		subscribeToActiveGroup('g1')

		// Find the postgres_changes handler from the on() calls
		const pgCall = mockChannel.on.mock.calls.find(
			(call: unknown[]) => call[0] === 'postgres_changes',
		)
		expect(pgCall).toBeDefined()

		const handler = pgCall[2] as (payload: { new: Record<string, unknown> }) => void
		const row = {
			id: 'm1',
			group_id: 'g1',
			user_id: 'u2',
			content: 'Hello',
			media_url: null,
			media_type: null,
			media_path: null,
			created_at: '2026-01-01T00:00:00Z',
		}

		useChatStore.getState().setMessages('g1', [])
		handler({ new: row })

		expect(useChatStore.getState().messages.g1).toHaveLength(1)
		expect(useChatStore.getState().messages.g1[0].content).toBe('Hello')
		expect(useChatStore.getState().messages.g1[0].status).toBe('sent')
	})

	it('routes typing events to store.onTyping', () => {
		subscribeToActiveGroup('g1')

		const typingCall = mockChannel.on.mock.calls.find(
			(call: unknown[]) =>
				call[0] === 'broadcast' && (call[1] as { event: string }).event === 'typing',
		)
		expect(typingCall).toBeDefined()

		const handler = typingCall[2] as (payload: { payload: unknown }) => void
		handler({ payload: { user_id: 'u2' } })

		expect(useChatStore.getState().typingUsers.g1).toContain('u2')
	})

	it('subscribeToChatChannel export no longer exists', () => {
		expect((mod as Record<string, unknown>).subscribeToChatChannel).toBeUndefined()
	})
})

describe('broadcastTyping', () => {
	it('sends a typing event on the channel', () => {
		const unsub = subscribeToActiveGroup('g1')
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

		const unsub = subscribeToActiveGroup('g1')

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
