export interface ChatGroup {
	id: string
	name: string
	avatar_url: string | null
	invite_code: string
	created_by: string
	created_at: string
}

export interface ChatMember {
	group_id: string
	user_id: string
	role: 'owner' | 'member'
	joined_at: string
	last_read_at: string | null
}

export interface ChatMessage {
	id: string
	group_id: string
	user_id: string
	content: string
	media_url: string | null
	media_type: string | null
	created_at: string
	/** Client-side optimistic status — not persisted in DB */
	status: 'pending' | 'sent' | 'failed'
}

export type ChatSidebarPanel = 'groups' | 'settings' | 'join-modal' | 'create-modal' | null

export interface ChatAppState {
	active_group_id: string | null
	sidebar: ChatSidebarPanel
}

export const DEFAULT_CHAT_STATE: ChatAppState = {
	active_group_id: null,
	sidebar: null,
}
