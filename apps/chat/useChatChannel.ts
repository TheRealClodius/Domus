import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/core/supabase/client'
import { useChatStore } from '@/apps/chat/chatStore'
import type { ChatMessage } from '@/apps/chat/types'

const channels: Record<string, RealtimeChannel> = {}
const typingThrottles: Record<string, number> = {}

const TYPING_THROTTLE_MS = 2000

export function subscribeToChatChannel(groupId: string): () => void {
	const supabase = getSupabaseBrowserClient()
	const channel = supabase.channel(`chat:${groupId}`)

	channel
		.on('broadcast', { event: 'message' }, (payload) => {
			const msg = payload.payload as ChatMessage
			useChatStore.getState().onMessage(groupId, msg)
		})
		.on('broadcast', { event: 'typing' }, (payload) => {
			const { user_id } = payload.payload as { user_id: string }
			useChatStore.getState().onTyping(groupId, user_id)
		})
		.subscribe()

	channels[groupId] = channel

	return () => {
		supabase.removeChannel(channel)
		delete channels[groupId]
	}
}

export function broadcastTyping(groupId: string, userId: string): void {
	const channel = channels[groupId]
	if (!channel) return

	const now = Date.now()
	const lastSent = typingThrottles[groupId] ?? 0

	if (now - lastSent < TYPING_THROTTLE_MS) return

	typingThrottles[groupId] = now
	channel.send({
		type: 'broadcast',
		event: 'typing',
		payload: { user_id: userId },
	})
}

export function broadcastMessage(groupId: string, message: ChatMessage): void {
	const channel = channels[groupId]
	if (!channel) return

	channel.send({
		type: 'broadcast',
		event: 'message',
		payload: message,
	})
}

export function unsubscribeAll(): void {
	const supabase = getSupabaseBrowserClient()
	for (const [groupId, channel] of Object.entries(channels)) {
		supabase.removeChannel(channel)
		delete channels[groupId]
	}
}
