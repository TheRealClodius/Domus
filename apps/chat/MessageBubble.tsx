import { memo } from 'react'
import type { ChatMessage } from '@/apps/chat/types'

interface MessageBubbleProps {
	message: ChatMessage
	isSent: boolean
	senderName?: string
}

function isImageType(mediaType: string | null): boolean {
	return mediaType?.startsWith('image/') ?? false
}

function formatTime(iso: string): string {
	const date = new Date(iso)
	return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default memo(function MessageBubble({ message, isSent, senderName }: MessageBubbleProps) {
	return (
		<div
			data-testid={`message-${message.id}`}
			className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
		>
			<div
				className={`max-w-[80%] rounded-xl px-3 py-2 shadow-resting ${
					isSent
						? 'bg-primary text-on-primary'
						: 'bg-surface-raised text-on-surface'
				}`}
			>
				{!isSent && senderName && (
					<p className="text-label text-on-surface-muted mb-0.5">{senderName}</p>
				)}

				{message.media_url && isImageType(message.media_type) && (
					<img
						src={message.media_url}
						alt="Shared image"
						className="rounded-lg max-w-full mb-1"
					/>
				)}

				{message.media_url && !isImageType(message.media_type) && (
					<a
						href={message.media_url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-2 py-1 text-label text-on-surface-muted mb-1 hover:underline"
					>
						File attachment
					</a>
				)}

				{message.content && <p className="text-body whitespace-pre-wrap">{message.content}</p>}

				<div className="flex items-center justify-end gap-1.5 mt-0.5">
					<span data-testid="message-timestamp" className="text-label opacity-60">
						{formatTime(message.created_at)}
					</span>
					{isSent && message.status === 'pending' && (
						<span className="text-label opacity-60">Sending...</span>
					)}
					{isSent && message.status === 'failed' && (
						<span className="text-label text-error">Failed to send</span>
					)}
				</div>
			</div>
		</div>
	)
})
