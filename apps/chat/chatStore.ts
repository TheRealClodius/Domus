import { create } from 'zustand'
import type { ChatGroup, ChatMessage, ChatSidebarPanel } from '@/apps/chat/types'

export interface ChatUserProfile {
	name: string | null
	username: string
	avatar_url: string | null
}

interface ChatStore {
	groups: ChatGroup[]
	messages: Record<string, ChatMessage[]>
	unreadCounts: Record<string, number>
	typingUsers: Record<string, string[]>
	profiles: Record<string, ChatUserProfile>
	dmPartners: Record<string, string>
	mediaUrls: Record<string, string>

	activeGroupId: string | null
	sidebar: ChatSidebarPanel

	setGroups: (groups: ChatGroup[]) => void
	setMessages: (groupId: string, messages: ChatMessage[]) => void
	prependMessages: (groupId: string, older: ChatMessage[]) => void
	addOptimisticMessage: (groupId: string, message: ChatMessage) => void
	confirmMessage: (groupId: string, tempId: string, confirmed: ChatMessage) => void
	failMessage: (groupId: string, tempId: string) => void
	setProfiles: (profiles: Record<string, ChatUserProfile>) => void
	setDMPartners: (partners: Record<string, string>) => void
	setMediaUrl: (messageId: string, url: string) => void

	setActiveGroup: (groupId: string) => void
	setSidebar: (panel: ChatSidebarPanel) => void
	markRead: (groupId: string) => void

	onMessage: (groupId: string, message: ChatMessage) => void
	onTyping: (groupId: string, userId: string) => void

	reset: () => void
}

const typingTimers: Record<string, Record<string, ReturnType<typeof setTimeout>>> = {}

function clearTypingTimer(groupId: string, userId: string) {
	typingTimers[groupId]?.[userId] && clearTimeout(typingTimers[groupId][userId])
}

const INITIAL_STATE = {
	groups: [] as ChatGroup[],
	messages: {} as Record<string, ChatMessage[]>,
	unreadCounts: {} as Record<string, number>,
	typingUsers: {} as Record<string, string[]>,
	profiles: {} as Record<string, ChatUserProfile>,
	dmPartners: {} as Record<string, string>,
	mediaUrls: {} as Record<string, string>,
	activeGroupId: null as string | null,
	sidebar: null as ChatSidebarPanel,
}

export const useChatStore = create<ChatStore>((set, get) => ({
	...INITIAL_STATE,

	setGroups: (groups) => set({ groups }),

	setMessages: (groupId, messages) =>
		set((s) => ({ messages: { ...s.messages, [groupId]: messages } })),

	prependMessages: (groupId, older) =>
		set((s) => ({
			messages: {
				...s.messages,
				[groupId]: [...older, ...(s.messages[groupId] ?? [])],
			},
		})),

	addOptimisticMessage: (groupId, message) =>
		set((s) => ({
			messages: {
				...s.messages,
				[groupId]: [...(s.messages[groupId] ?? []), message],
			},
		})),

	confirmMessage: (groupId, tempId, confirmed) =>
		set((s) => ({
			messages: {
				...s.messages,
				[groupId]: (s.messages[groupId] ?? []).map((m) => (m.id === tempId ? confirmed : m)),
			},
		})),

	failMessage: (groupId, tempId) =>
		set((s) => ({
			messages: {
				...s.messages,
				[groupId]: (s.messages[groupId] ?? []).map((m) =>
					m.id === tempId ? { ...m, status: 'failed' as const } : m,
				),
			},
		})),

	setProfiles: (profiles) => set((s) => ({ profiles: { ...s.profiles, ...profiles } })),

	setDMPartners: (partners) => set((s) => ({ dmPartners: { ...s.dmPartners, ...partners } })),

	setMediaUrl: (messageId, url) =>
		set((s) => ({ mediaUrls: { ...s.mediaUrls, [messageId]: url } })),

	setActiveGroup: (groupId) =>
		set((s) => ({
			activeGroupId: groupId,
			unreadCounts: { ...s.unreadCounts, [groupId]: 0 },
		})),

	setSidebar: (panel) => set({ sidebar: panel }),

	markRead: (groupId) =>
		set((s) => ({
			unreadCounts: { ...s.unreadCounts, [groupId]: 0 },
		})),

	onMessage: (groupId, message) => {
		const { activeGroupId } = get()
		set((s) => {
			const existing = s.messages[groupId] ?? []
			// Deduplicate: skip if message id already exists (e.g. sender's own broadcast echo)
			if (existing.some((m) => m.id === message.id)) return s
			const isActive = activeGroupId === groupId
			return {
				messages: {
					...s.messages,
					[groupId]: [...existing, message],
				},
				unreadCounts: isActive
					? s.unreadCounts
					: { ...s.unreadCounts, [groupId]: (s.unreadCounts[groupId] ?? 0) + 1 },
			}
		})
	},

	onTyping: (groupId, userId) => {
		clearTypingTimer(groupId, userId)

		set((s) => {
			const current = s.typingUsers[groupId] ?? []
			if (current.includes(userId)) return s
			return {
				typingUsers: { ...s.typingUsers, [groupId]: [...current, userId] },
			}
		})

		if (!typingTimers[groupId]) typingTimers[groupId] = {}
		typingTimers[groupId][userId] = setTimeout(() => {
			set((s) => ({
				typingUsers: {
					...s.typingUsers,
					[groupId]: (s.typingUsers[groupId] ?? []).filter((id) => id !== userId),
				},
			}))
			delete typingTimers[groupId][userId]
		}, 3000)
	},

	reset: () => {
		// Clear all typing timers
		for (const groupId of Object.keys(typingTimers)) {
			for (const userId of Object.keys(typingTimers[groupId])) {
				clearTimeout(typingTimers[groupId][userId])
			}
			delete typingTimers[groupId]
		}
		set(INITIAL_STATE)
	},
}))
