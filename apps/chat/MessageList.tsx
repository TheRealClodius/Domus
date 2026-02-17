'use client'

import { MessageSquare } from 'lucide-react'
import { useEffect, useRef } from 'react'
import MessageBubble from '@/apps/chat/MessageBubble'
import TypingIndicator from '@/apps/chat/TypingIndicator'
import type { ChatMessage } from '@/apps/chat/types'

interface MessageListProps {
	messages: ChatMessage[]
	currentUserId: string
	typingUserNames: string[]
	onLoadMore?: () => void
}

export default function MessageList({
	messages,
	currentUserId,
	typingUserNames,
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

	return (
		<div ref={containerRef} className="flex flex-col gap-6 py-4">
			{onLoadMore && messages.length > 0 && (
				<button
					type="button"
					onClick={onLoadMore}
					className="text-label text-on-surface-muted hover:text-on-surface self-center py-1"
					aria-label="Load more messages"
				>
					Load more
				</button>
			)}

			{messages.map((msg) => (
				<MessageBubble key={msg.id} message={msg} isSent={msg.user_id === currentUserId} />
			))}

			<TypingIndicator userNames={typingUserNames} />
			<div ref={bottomRef} />
		</div>
	)
}
