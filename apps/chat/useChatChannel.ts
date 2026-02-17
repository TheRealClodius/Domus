import type { RealtimeChannel } from '@supabase/supabase-js'
import { useChatStore } from '@/apps/chat/chatStore'
import type { ChatMessage } from '@/apps/chat/types'
import { getSupabaseBrowserClient } from '@/core/supabase/client'

const channels: Record<string, RealtimeChannel> = {}
const typingThrottles: Record<string, number> = {}

const TYPING_THROTTLE_MS = 2000

export function subscribeToChatChannel(groupId: string): () => void {
	const supabase = getSupabaseBrowserClient()
	const channel = supabase.channel(`chat:${groupId}`)

	channel
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'chat_messages',
				filter: `group_id=eq.${groupId}`,
			},
			(payload) => {
				const msg = { ...payload.new, status: 'sent' } as ChatMessage
				useChatStore.getState().onMessage(groupId, msg)
			},
		)
		// TODO: typing broadcast is unauthenticated — user_id can be spoofed.
		// Supabase Realtime broadcast has no server-side payload validation hook.
		// Low risk (ephemeral UI indicator), but revisit if Realtime adds authorization callbacks.
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

export function unsubscribeAll(): void {
	const supabase = getSupabaseBrowserClient()
	for (const [groupId, channel] of Object.entries(channels)) {
		supabase.removeChannel(channel)
		delete channels[groupId]
	}
}
