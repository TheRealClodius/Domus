import { MessageSquare } from 'lucide-react'
import type { BuiltInApp } from '@/apps/_types'
import ChatApp from '@/apps/chat/ChatApp'
import { type ChatAppState, DEFAULT_CHAT_STATE } from '@/apps/chat/types'

function reduce(
	state: Record<string, unknown>,
	action: string,
	params: unknown,
): Record<string, unknown> {
	const chat = (state.active_group_id !== undefined
		? state
		: { ...DEFAULT_CHAT_STATE }) as ChatAppState
	const p = params as Record<string, unknown>

	switch (action) {
		case 'set_active_group':
			return { ...chat, active_group_id: (p.group_id as string) ?? null }
		case 'set_sidebar':
			return { ...chat, sidebar: (p.sidebar as ChatAppState['sidebar']) ?? null }
		default:
			return state
	}
}

function summarize(state: Record<string, unknown>): string {
	const chat = (state.active_group_id !== undefined
		? state
		: DEFAULT_CHAT_STATE) as ChatAppState
	if (!chat.active_group_id) return 'Chat'
	// The group name isn't in entity state — just show "Chat" with group indicator
	return 'Chat — active'
}

export const chatApp: BuiltInApp = {
	source: 'built-in',
	type: 'chat',
	name: 'Chat',
	icon: MessageSquare,
	component: ChatApp,
	defaultPresentation: 'window',
	defaultSize: { width: 400, height: 500 },
	maxInstances: 1,
	reduce,
	summarize,
}
