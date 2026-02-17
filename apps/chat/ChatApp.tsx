'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import type { AppProps } from '@/apps/_types'
import ChatAuthGate from '@/apps/chat/ChatAuthGate'
import ChatHeaderButtons from '@/apps/chat/ChatHeaderButtons'
import ChatInput from '@/apps/chat/ChatInput'
import ChatSidebar from '@/apps/chat/ChatSidebar'
import MessageList from '@/apps/chat/MessageList'
import { useChatStore } from '@/apps/chat/chatStore'
import * as queries from '@/apps/chat/queries'
import type { ChatAppState } from '@/apps/chat/types'
import {
	broadcastMessage,
	broadcastTyping,
	subscribeToChatChannel,
	unsubscribeAll,
} from '@/apps/chat/useChatChannel'
import { getSupabaseBrowserClient } from '@/core/supabase/client'

export default function ChatApp({ dispatch }: AppProps) {
	const [userId, setUserId] = useState<string | null>(null)
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
	const channelCleanups = useRef<Array<() => void>>([])

	const groups = useChatStore((s) => s.groups)
	const activeGroupId = useChatStore((s) => s.activeGroupId)
	const messages = useChatStore((s) => s.messages)
	const unreadCounts = useChatStore((s) => s.unreadCounts)
	const typingUsers = useChatStore((s) => s.typingUsers)
	const sidebar = useChatStore((s) => s.sidebar)
	const store = useChatStore.getState

	const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null
	const activeMessages = activeGroupId ? messages[activeGroupId] ?? [] : []
	const activeTypingUsers = activeGroupId ? typingUsers[activeGroupId] ?? [] : []

	// Auth check
	useEffect(() => {
		const supabase = getSupabaseBrowserClient()
		supabase.auth.getUser().then(({ data: { user } }) => {
			if (user && !user.is_anonymous) {
				setUserId(user.id)
				setIsAuthenticated(true)
			} else {
				setIsAuthenticated(false)
			}
		})
	}, [])

	// Load groups + subscribe to channels when authenticated
	useEffect(() => {
		if (!isAuthenticated || !userId) return

		const supabase = getSupabaseBrowserClient()
		queries.fetchGroups(supabase).then((fetched) => {
			store().setGroups(fetched)
			// Subscribe to all group channels for unread notifications
			for (const group of fetched) {
				channelCleanups.current.push(subscribeToChatChannel(group.id))
			}
		})

		return () => {
			for (const cleanup of channelCleanups.current) cleanup()
			channelCleanups.current = []
			unsubscribeAll()
		}
	}, [isAuthenticated, userId, store])

	// Fetch messages when active group changes
	useEffect(() => {
		if (!activeGroupId || !isAuthenticated) return
		const supabase = getSupabaseBrowserClient()
		queries.fetchMessages(supabase, activeGroupId).then((msgs) => {
			// fetchMessages returns newest-first, reverse for display
			store().setMessages(activeGroupId, msgs.reverse())
		})
	}, [activeGroupId, isAuthenticated, store])

	const handleSelectGroup = useCallback(
		(groupId: string) => {
			store().setActiveGroup(groupId)
			store().setSidebar(null)
			dispatch('set_active_group', { group_id: groupId })
		},
		[store, dispatch],
	)

	const handleCreateGroup = useCallback(
		async (name: string) => {
			const supabase = getSupabaseBrowserClient()
			const group = await queries.createGroup(supabase, name)
			store().setGroups([group, ...store().groups])
			handleSelectGroup(group.id)
			channelCleanups.current.push(subscribeToChatChannel(group.id))
		},
		[store, handleSelectGroup],
	)

	const handleJoinGroup = useCallback(
		async (code: string) => {
			const supabase = getSupabaseBrowserClient()
			const group = await queries.joinGroup(supabase, code)
			store().setGroups([group, ...store().groups])
			handleSelectGroup(group.id)
			channelCleanups.current.push(subscribeToChatChannel(group.id))
		},
		[store, handleSelectGroup],
	)

	const handleSend = useCallback(
		async (content: string) => {
			if (!activeGroupId || !userId) return

			const tempId = `temp-${Date.now()}`
			const optimistic = {
				id: tempId,
				group_id: activeGroupId,
				user_id: userId,
				content,
				media_url: null,
				media_type: null,
				created_at: new Date().toISOString(),
				status: 'pending' as const,
			}

			store().addOptimisticMessage(activeGroupId, optimistic)

			try {
				const supabase = getSupabaseBrowserClient()
				const confirmed = await queries.sendMessage(supabase, {
					group_id: activeGroupId,
					user_id: userId,
					content,
				})
				store().confirmMessage(activeGroupId, tempId, confirmed)
				broadcastMessage(activeGroupId, confirmed)
			} catch {
				store().failMessage(activeGroupId, tempId)
			}
		},
		[activeGroupId, userId, store],
	)

	const handleTyping = useCallback(() => {
		if (activeGroupId && userId) {
			broadcastTyping(activeGroupId, userId)
		}
	}, [activeGroupId, userId])

	const handleToggleGroups = useCallback(() => {
		const current = store().sidebar
		store().setSidebar(current === 'groups' ? null : 'groups')
	}, [store])

	const handleToggleSettings = useCallback(() => {
		const current = store().sidebar
		store().setSidebar(current === 'settings' ? null : 'settings')
	}, [store])

	const handleLoadMore = useCallback(async () => {
		if (!activeGroupId) return
		const msgs = store().messages[activeGroupId] ?? []
		if (msgs.length === 0) return
		const oldest = msgs[0].created_at
		const supabase = getSupabaseBrowserClient()
		const older = await queries.fetchMessages(supabase, activeGroupId, oldest)
		store().prependMessages(activeGroupId, older.reverse())
	}, [activeGroupId, store])

	// Still loading auth
	if (isAuthenticated === null) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="size-5 border-2 border-on-surface-muted border-t-transparent rounded-full animate-spin" />
			</div>
		)
	}

	return (
		<ChatAuthGate isAuthenticated={isAuthenticated}>
			<div className="flex h-full relative">
				{/* Sidebar overlay */}
				{sidebar && (
					<div className="absolute inset-0 z-20 flex">
						<div className="w-64 h-full shadow-elevated">
							{sidebar === 'groups' ? (
								<ChatSidebar
									mode="groups"
									groups={groups}
									activeGroupId={activeGroupId}
									unreadCounts={unreadCounts}
									onSelectGroup={handleSelectGroup}
									onCreateGroup={handleCreateGroup}
									onJoinGroup={handleJoinGroup}
									onClose={() => {
										store().setSidebar(null)
									}}
								/>
							) : activeGroup ? (
								<ChatSidebar
									mode="settings"
									activeGroup={activeGroup}
									onClose={() => {
										store().setSidebar(null)
									}}
								/>
							) : null}
						</div>
						{/* Scrim to close sidebar */}
						{/* biome-ignore lint/a11y/useKeyboardHandler: scrim click-to-close */}
						<div
							className="flex-1 bg-overlay-scrim/30"
							onClick={() => {
								store().setSidebar(null)
								dispatch('set_sidebar', { sidebar: null })
							}}
						/>
					</div>
				)}

				{/* Main content */}
				<div className="flex flex-col flex-1 min-w-0">
					{activeGroupId && activeGroup ? (
						<>
							<div className="flex-1 overflow-auto px-3">
								<MessageList
									messages={activeMessages}
									currentUserId={userId ?? ''}
									typingUserNames={activeTypingUsers}
									onLoadMore={activeMessages.length >= 50 ? handleLoadMore : undefined}
								/>
							</div>
							<ChatInput
								onSend={handleSend}
								onTyping={handleTyping}
							/>
						</>
					) : (
						<div className="flex flex-col items-center justify-center gap-3 h-full text-on-surface-muted">
							<MessageSquare className="size-8" />
							<p className="text-body-sm">Select a group to start chatting</p>
						</div>
					)}
				</div>
			</div>
		</ChatAuthGate>
	)
}

/** Header actions for the Window component */
export function ChatHeaderActions() {
	const activeGroup = useChatStore((s) => {
		const id = s.activeGroupId
		return id ? s.groups.find((g) => g.id === id) : null
	})
	const store = useChatStore.getState

	return (
		<ChatHeaderButtons
			activeGroupName={activeGroup?.name}
			onToggleGroups={() => {
				const current = store().sidebar
				store().setSidebar(current === 'groups' ? null : 'groups')
			}}
			onToggleSettings={() => {
				const current = store().sidebar
				store().setSidebar(current === 'settings' ? null : 'settings')
			}}
		/>
	)
}
