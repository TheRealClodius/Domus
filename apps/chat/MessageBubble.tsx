import { ChevronDown, Smile } from 'lucide-react'
import Image from 'next/image'
import { memo } from 'react'
import type { ChatMessage } from '@/apps/chat/types'
import { Button } from '@/core/ui/button'

interface MessageBubbleProps {
	message: ChatMessage
	isSent: boolean
}

function isImageType(mediaType: string | null): boolean {
	return mediaType?.startsWith('image/') ?? false
}

function formatTime(iso: string): string {
	const date = new Date(iso)
	return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const SENT_RADIUS = 'rounded-tl-[12px] rounded-tr-[12px] rounded-bl-[12px] rounded-br-[4px]'
const RECV_RADIUS = 'rounded-tl-[12px] rounded-tr-[12px] rounded-bl-[4px] rounded-br-[12px]'

export default memo(function MessageBubble({ message, isSent }: MessageBubbleProps) {
	const mediaUrl = message.media_url ?? ''
	const hasImage = !!message.media_url && isImageType(message.media_type)
	const hasFile = !!message.media_url && !isImageType(message.media_type)
	const radiusClass = isSent ? SENT_RADIUS : RECV_RADIUS
	const bgClass = isSent ? 'bg-primary text-on-primary' : 'bg-surface-sunken text-on-surface'

	return (
		<div
			data-testid={`message-${message.id}`}
			className={`group relative flex ${isSent ? 'justify-end' : 'justify-start'}`}
		>
			{/* Hover action bar */}
			<div
				className={`absolute -top-7 flex items-center gap-0.5 rounded-lg bg-surface-raised shadow-resting px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isSent ? 'right-0' : 'left-0'}`}
			>
				<Button type="button" variant="ghost" size="icon-xs" aria-label="React">
					<Smile className="size-3.5" />
				</Button>
				<Button type="button" variant="ghost" size="icon-xs" aria-label="More options">
					<ChevronDown className="size-3.5" />
				</Button>
			</div>

			<div
				className={`max-w-[80%] overflow-hidden ${bgClass} ${radiusClass} ${hasImage ? 'w-[300px]' : ''}`}
			>
				{/* Image fills the full bubble width, no padding */}
				{hasImage && (
					<div className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
						<Image
							src={mediaUrl}
							alt="Shared media"
							fill
							sizes="300px"
							className="object-cover"
							unoptimized
						/>
					</div>
				)}

				{/* File attachment / text / timestamp — only render when there's content below the image */}
				<div className={hasFile || message.content ? 'px-4 py-3' : 'hidden'}>
					{hasFile && (
						<a
							href={mediaUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 rounded-md bg-surface-sunken px-2 py-1 text-label text-on-surface-muted mb-1 hover:underline"
						>
							File attachment
						</a>
					)}

					{message.content && <p className="text-body whitespace-pre-wrap">{message.content}</p>}

					<div className="flex items-center justify-end gap-1.5 mt-1">
						<span
							data-testid="message-timestamp"
							className="text-label opacity-0 group-hover:opacity-60 transition-opacity"
						>
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
		</div>
	)
})
