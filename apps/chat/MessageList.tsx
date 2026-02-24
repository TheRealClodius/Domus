'use client'

import { MessageSquare } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ChatUserProfile } from '@/apps/chat/chatStore'
import MessageBubble from '@/apps/chat/MessageBubble'
import TypingIndicator from '@/apps/chat/TypingIndicator'
import type { ChatMessage } from '@/apps/chat/types'
import { Button } from '@/core/ui/button'

interface MessageListProps {
	messages: ChatMessage[]
	currentUserId: string
	typingUserNames: string[]
	profiles: Record<string, ChatUserProfile>
	mediaUrls?: Record<string, string>
	onLoadMore?: () => void
}

/** Group consecutive messages by user_id, returning start/end indices */
function computeGroups(messages: ChatMessage[]): Array<{ start: number; end: number }> {
	if (messages.length === 0) return []
	const groups: Array<{ start: number; end: number }> = []
	let start = 0
	for (let i = 1; i <= messages.length; i++) {
		if (i === messages.length || messages[i].user_id !== messages[start].user_id) {
			groups.push({ start, end: i - 1 })
			start = i
		}
	}
	return groups
}

export default function MessageList({
	messages,
	currentUserId,
	typingUserNames,
	profiles,
	mediaUrls = {},
	onLoadMore,
}: MessageListProps) {
	const bottomRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const prevMessageCount = useRef(messages.length)

	// Auto-scroll to bottom on new messages (not on pagination prepend)
	useEffect(() => {
		if (messages.length > prevMessageCount.current) {
			if (prevMessageCount.current > 0) {
				bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' })
			}
		}
		prevMessageCount.current = messages.length
	}, [messages])

	// Scroll to bottom on initial load
	useEffect(() => {
		bottomRef.current?.scrollIntoView?.()
	}, [])

	if (messages.length === 0 && typingUserNames.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 h-full text-on-surface-muted">
				<MessageSquare className="size-6" />
				<p className="text-body-sm">No messages yet. Say hello!</p>
			</div>
		)
	}

	const groups = computeGroups(messages)

	return (
		<div ref={containerRef} className="flex flex-col gap-4 pt-14 pb-24">
			{onLoadMore && messages.length > 0 && (
				<Button
					type="button"
					variant="ghost"
					size="xs"
					className="self-center text-on-surface-muted"
					onClick={onLoadMore}
					aria-label="Load more messages"
				>
					Load more
				</Button>
			)}

			{groups.map((group) => (
				<div key={messages[group.start].id} className="flex flex-col gap-1">
					{messages.slice(group.start, group.end + 1).map((msg, i) => (
						<MessageBubble
							key={msg.id}
							message={msg}
							isSent={msg.user_id === currentUserId}
							isFirstInGroup={i === 0}
							isLastInGroup={i === group.end - group.start}
							profile={profiles[msg.user_id]}
							resolvedMediaUrl={mediaUrls[msg.id]}
						/>
					))}
				</div>
			))}

			<TypingIndicator userNames={typingUserNames} />
			<div ref={bottomRef} />
		</div>
	)
}
