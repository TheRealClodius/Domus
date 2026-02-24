'use client'

// TODO: add card mode — if (mode === 'card') return <ChatCard />

import { MessageSquare } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppProps } from '@/apps/_types'
import ChatAuthGate from '@/apps/chat/ChatAuthGate'
import ChatGroupModal from '@/apps/chat/ChatGroupModal'
import ChatInput from '@/apps/chat/ChatInput'
import ChatSidebar from '@/apps/chat/ChatSidebar'
import { useChatStore } from '@/apps/chat/chatStore'
import MessageList from '@/apps/chat/MessageList'
import * as queries from '@/apps/chat/queries'
import UserSearchPanel from '@/apps/chat/UserSearchPanel'
import { broadcastTyping, subscribeToActiveGroup, unsubscribeAll } from '@/apps/chat/useChatChannel'
import { uploadMedia } from '@/apps/chat/useMediaUpload'
import { getSupabaseBrowserClient } from '@/core/supabase/client'
import { SPRING } from '@/lib/motion'
import { cn } from '@/lib/utils'

function SidebarOverlay({
	anchor,
	onClose,
	children,
}: {
	anchor: 'left' | 'right'
	onClose: () => void
	children: React.ReactNode
}) {
	const isLeft = anchor === 'left'
	return (
		<motion.div
			key={`sidebar-overlay-${anchor}`}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.15 }}
			className={cn(
				'absolute -left-4 inset-y-0 -right-4 z-20 flex pointer-events-none',
				!isLeft && 'flex-row-reverse',
			)}
		>
			<motion.div
				initial={{ scale: 0.92 }}
				animate={{ scale: 1 }}
				exit={{ scale: 0.92 }}
				transition={SPRING.popIn}
				style={{ transformOrigin: `${anchor} center` }}
				className={cn(
					'mb-2 mt-12 w-60 rounded-xl overflow-hidden shadow-elevated border border-outline-variant pointer-events-auto',
					isLeft ? 'ml-2' : 'mr-2',
				)}
			>
				{children}
			</motion.div>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: click-to-close backdrop */}
			<div
				role="presentation"
				className="flex-1 pointer-events-auto"
				onClick={onClose}
				onKeyDown={(e) => {
					if (e.key === 'Escape') onClose()
				}}
			/>
		</motion.div>
	)
}

function FullPanelOverlay({ children }: { onClose: () => void; children: React.ReactNode }) {
	return (
		<motion.div
			key="full-panel-overlay"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.15 }}
			className="absolute -left-4 inset-y-0 -right-4 z-20 pointer-events-none"
		>
			<motion.div
				initial={{ scale: 0.96 }}
				animate={{ scale: 1 }}
				exit={{ scale: 0.96 }}
				transition={SPRING.popIn}
				style={{ transformOrigin: 'center center' }}
				className="mt-12 mb-2 mx-2 h-[calc(100%-3.5rem)] rounded-xl overflow-hidden shadow-elevated border border-outline-variant pointer-events-auto"
			>
				{children}
			</motion.div>
		</motion.div>
	)
}

export default function ChatApp({ dispatch }: AppProps) {
	const [userId, setUserId] = useState<string | null>(null)
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
	const cleanupRef = useRef<(() => void) | null>(null)

	const groups = useChatStore((s) => s.groups)
	const activeGroupId = useChatStore((s) => s.activeGroupId)
	const messages = useChatStore((s) => s.messages)
	const unreadCounts = useChatStore((s) => s.unreadCounts)
	const typingUsers = useChatStore((s) => s.typingUsers)
	const sidebar = useChatStore((s) => s.sidebar)
	const profiles = useChatStore((s) => s.profiles)
	const dmPartners = useChatStore((s) => s.dmPartners)
	const mediaUrls = useChatStore((s) => s.mediaUrls)
	const store = useChatStore.getState

	const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null
	const activeMessages = activeGroupId ? (messages[activeGroupId] ?? []) : []
	const activeTypingUsers = activeGroupId ? (typingUsers[activeGroupId] ?? []) : []

	// Derive last message preview + timestamp for each group
	const lastMessages = Object.fromEntries(
		groups.map((g) => {
			const msgs = messages[g.id]
			const last = msgs?.[msgs.length - 1]
			if (!last) return [g.id, undefined]
			const time = new Date(last.created_at).toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
			})
			return [g.id, { preview: last.content, timestamp: time }]
		}),
	)

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

	// Load groups when authenticated
	useEffect(() => {
		if (!isAuthenticated || !userId) return

		const supabase = getSupabaseBrowserClient()
		queries.fetchGroups(supabase).then(async (fetched) => {
			store().setGroups(fetched)

			// Resolve DM partner profiles
			const dmGroups = fetched.filter((g) => g.kind === 'dm')
			if (dmGroups.length > 0) {
				const dmGroupIds = dmGroups.map((g) => g.id)
				const partners = await queries.fetchDMPartners(supabase, dmGroupIds, userId)
				store().setDMPartners(partners)

				const partnerIds = Object.values(partners)
				const cached = store().profiles
				const uncached = partnerIds.filter((id) => !cached[id])
				if (uncached.length > 0) {
					const p = await queries.fetchUserProfiles(supabase, uncached)
					store().setProfiles(p)
				}
			}
		})

		return () => {
			unsubscribeAll()
		}
	}, [isAuthenticated, userId])

	// Subscribe to active group's realtime channel
	useEffect(() => {
		if (!activeGroupId || !isAuthenticated) return

		const cleanup = subscribeToActiveGroup(activeGroupId)
		cleanupRef.current = cleanup

		return () => {
			cleanup()
			cleanupRef.current = null
		}
	}, [activeGroupId, isAuthenticated])

	// Fetch messages when active group changes
	useEffect(() => {
		if (!activeGroupId || !isAuthenticated) return
		const supabase = getSupabaseBrowserClient()
		queries.fetchMessages(supabase, activeGroupId).then((msgs) => {
			// fetchMessages returns newest-first, reverse for display
			const reversed = msgs.reverse()
			store().setMessages(activeGroupId, reversed)

			// Fetch profiles for any uncached user_ids
			const cached = store().profiles
			const uncached = [...new Set(reversed.map((m) => m.user_id))].filter((id) => !cached[id])
			if (uncached.length > 0) {
				queries.fetchUserProfiles(supabase, uncached).then((p) => store().setProfiles(p))
			}

			// Resolve media URLs for messages with media_path
			for (const msg of reversed) {
				if (msg.media_path && !store().mediaUrls[msg.id]) {
					queries.getMediaUrl(msg.media_path).then((url) => store().setMediaUrl(msg.id, url))
				}
			}
		})
	}, [activeGroupId, isAuthenticated])

	const handleSelectGroup = useCallback(
		(groupId: string) => {
			store().setActiveGroup(groupId)
			dispatch('set_active_group', { group_id: groupId })
		},
		[dispatch],
	)

	const handleSend = useCallback(
		async (content: string, file?: File) => {
			if (!activeGroupId || !userId) return

			const tempId = `temp-${Date.now()}`
			const optimistic: import('@/apps/chat/types').ChatMessage = {
				id: tempId,
				group_id: activeGroupId,
				user_id: userId,
				content,
				media_url: null,
				media_type: null,
				media_path: null,
				created_at: new Date().toISOString(),
				status: 'pending' as const,
			}

			store().addOptimisticMessage(activeGroupId, optimistic)

			try {
				let mediaPath: string | undefined
				let mediaType: string | undefined

				if (file) {
					const result = await uploadMedia(file, activeGroupId, tempId, userId)
					mediaPath = result.path
					mediaType = result.type
				}

				const supabase = getSupabaseBrowserClient()
				const confirmed = await queries.sendMessage(supabase, {
					group_id: activeGroupId,
					user_id: userId,
					content,
					media_path: mediaPath,
					media_type: mediaType,
				})
				store().confirmMessage(activeGroupId, tempId, confirmed)

				// Resolve media URL for the confirmed message
				if (confirmed.media_path) {
					queries
						.getMediaUrl(confirmed.media_path)
						.then((url) => store().setMediaUrl(confirmed.id, url))
				}
			} catch {
				store().failMessage(activeGroupId, tempId)
			}
		},
		[activeGroupId, userId],
	)

	const handleTyping = useCallback(() => {
		if (activeGroupId && userId) {
			broadcastTyping(activeGroupId, userId)
		}
	}, [activeGroupId, userId])

	const handleLoadMore = useCallback(async () => {
		if (!activeGroupId) return
		const msgs = store().messages[activeGroupId] ?? []
		if (msgs.length === 0) return
		const oldest = msgs[0].created_at
		const supabase = getSupabaseBrowserClient()
		const older = await queries.fetchMessages(supabase, activeGroupId, oldest)
		const reversed = older.reverse()
		store().prependMessages(activeGroupId, reversed)

		// Resolve media URLs for older messages
		for (const msg of reversed) {
			if (msg.media_path && !store().mediaUrls[msg.id]) {
				queries.getMediaUrl(msg.media_path).then((url) => store().setMediaUrl(msg.id, url))
			}
		}
	}, [activeGroupId])

	const handleCreateGroup = useCallback(
		async (name: string, avatar?: File) => {
			const supabase = getSupabaseBrowserClient()
			const group = await queries.createGroup(supabase, name)

			// Upload avatar if provided
			if (avatar) {
				const avatarUrl = await queries.uploadGroupAvatar(supabase, group.id, avatar)
				group.avatar_url = avatarUrl
			}

			store().setGroups([group, ...store().groups])
			store().setActiveGroup(group.id)
			store().setSidebar(null)
			dispatch('set_active_group', { group_id: group.id })
		},
		[dispatch],
	)

	const handleJoinGroup = useCallback(
		async (code: string) => {
			const supabase = getSupabaseBrowserClient()
			const group = await queries.joinGroup(supabase, code)
			store().setGroups([group, ...store().groups])
			store().setActiveGroup(group.id)
			store().setSidebar(null)
			dispatch('set_active_group', { group_id: group.id })
		},
		[dispatch],
	)

	const handleStartDM = useCallback(
		async (otherUserId: string) => {
			const supabase = getSupabaseBrowserClient()
			const group = await queries.findOrCreateDM(supabase, otherUserId)

			// Add group to store if not already present
			const existing = store().groups.find((g) => g.id === group.id)
			if (!existing) {
				store().setGroups([group, ...store().groups])
			}

			// Ensure DM partner is tracked
			store().setDMPartners({ [group.id]: otherUserId })

			// Fetch partner profile if not cached
			if (!store().profiles[otherUserId]) {
				const p = await queries.fetchUserProfiles(supabase, [otherUserId])
				store().setProfiles(p)
			}

			store().setActiveGroup(group.id)
			store().setSidebar(null)
			dispatch('set_active_group', { group_id: group.id })
		},
		[dispatch],
	)

	const closeSidebar = useCallback(() => {
		store().setSidebar(null)
		dispatch('set_sidebar', { sidebar: null })
	}, [dispatch])

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
				{/* Groups sidebar — left-anchored */}
				<AnimatePresence>
					{sidebar === 'groups' && (
						<SidebarOverlay anchor="left" onClose={closeSidebar}>
							<ChatSidebar
								mode="groups"
								groups={groups}
								activeGroupId={activeGroupId}
								unreadCounts={unreadCounts}
								lastMessages={lastMessages}
								dmPartners={dmPartners}
								profiles={profiles}
								onSelectGroup={handleSelectGroup}
								onOpenJoinModal={() => store().setSidebar('join-modal')}
								onOpenCreateModal={() => store().setSidebar('create-modal')}
								onOpenNewDM={() => store().setSidebar('new-dm')}
								onClose={closeSidebar}
							/>
						</SidebarOverlay>
					)}
				</AnimatePresence>

				{/* Settings sidebar — right-anchored */}
				<AnimatePresence>
					{sidebar === 'settings' && activeGroup && (
						<SidebarOverlay anchor="right" onClose={closeSidebar}>
							<ChatSidebar mode="settings" activeGroup={activeGroup} onClose={closeSidebar} />
						</SidebarOverlay>
					)}
				</AnimatePresence>

				{/* Full-window group modals */}
				<AnimatePresence>
					{(sidebar === 'join-modal' || sidebar === 'create-modal') && (
						<FullPanelOverlay onClose={closeSidebar}>
							<ChatGroupModal
								mode={sidebar === 'join-modal' ? 'join' : 'create'}
								onClose={closeSidebar}
								onJoin={handleJoinGroup}
								onCreate={handleCreateGroup}
							/>
						</FullPanelOverlay>
					)}
				</AnimatePresence>

				{/* New DM search panel */}
				<AnimatePresence>
					{sidebar === 'new-dm' && (
						<FullPanelOverlay onClose={closeSidebar}>
							<UserSearchPanel onSelectUser={handleStartDM} onClose={closeSidebar} />
						</FullPanelOverlay>
					)}
				</AnimatePresence>

				{/* Main content */}
				<div className="relative flex-1 min-w-0">
					{activeGroupId && activeGroup ? (
						<>
							<div
								className="absolute inset-0 overflow-auto px-3 scroll-fade"
								style={{ '--scroll-fade-size': '3rem' } as React.CSSProperties}
							>
								<MessageList
									messages={activeMessages}
									currentUserId={userId ?? ''}
									typingUserNames={activeTypingUsers}
									profiles={profiles}
									mediaUrls={mediaUrls}
									onLoadMore={activeMessages.length >= 50 ? handleLoadMore : undefined}
								/>
							</div>
							<div className="absolute inset-x-0 bottom-6 z-10">
								<ChatInput onSend={handleSend} onTyping={handleTyping} />
							</div>
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
