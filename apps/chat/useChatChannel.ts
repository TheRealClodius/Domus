import type { RealtimeChannel } from '@supabase/supabase-js'
import { useChatStore } from '@/apps/chat/chatStore'
import type { ChatMessage } from '@/apps/chat/types'
import { getSupabaseBrowserClient } from '@/core/supabase/client'

let activeChannel: RealtimeChannel | null = null
let activeGroupId: string | null = null
const typingThrottles: Record<string, number> = {}

const TYPING_THROTTLE_MS = 2000

/**
 * Subscribe to a single active group's realtime channel.
 * Automatically unsubscribes from the previous active channel.
 * Returns a cleanup function.
 */
export function subscribeToActiveGroup(groupId: string): () => void {
	// Already subscribed to this group
	if (activeGroupId === groupId && activeChannel) {
		return () => unsubscribeActive()
	}

	// Unsubscribe from previous active channel
	unsubscribeActive()

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

	activeChannel = channel
	activeGroupId = groupId

	return () => unsubscribeActive()
}

export function broadcastTyping(groupId: string, userId: string): void {
	if (!activeChannel || activeGroupId !== groupId) return

	const now = Date.now()
	const lastSent = typingThrottles[groupId] ?? 0

	if (now - lastSent < TYPING_THROTTLE_MS) return

	typingThrottles[groupId] = now
	activeChannel.send({
		type: 'broadcast',
		event: 'typing',
		payload: { user_id: userId },
	})
}

function unsubscribeActive(): void {
	if (activeChannel) {
		const supabase = getSupabaseBrowserClient()
		supabase.removeChannel(activeChannel)
		activeChannel = null
		activeGroupId = null
	}
}

export function unsubscribeAll(): void {
	unsubscribeActive()
}
