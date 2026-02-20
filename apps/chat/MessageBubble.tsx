import { ChevronDown, Smile } from 'lucide-react'
import Image from 'next/image'
import { memo } from 'react'
import type { ChatUserProfile } from '@/apps/chat/chatStore'
import type { ChatMessage } from '@/apps/chat/types'
import { Button } from '@/core/ui/button'

interface MessageBubbleProps {
	message: ChatMessage
	isSent: boolean
	isFirstInGroup: boolean
	isLastInGroup: boolean
	profile?: ChatUserProfile
}

function isImageType(mediaType: string | null): boolean {
	return mediaType?.startsWith('image/') ?? false
}

function formatTime(iso: string): string {
	const date = new Date(iso)
	return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const SENT_RADIUS = 'rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-xs'
const RECV_RADIUS = 'rounded-tl-lg rounded-tr-lg rounded-bl-xs rounded-br-lg'

/** Deterministic hue from user ID for avatar fallback */
const AVATAR_HUES = [25, 60, 140, 200, 260, 310]
function avatarHue(userId: string): number {
	let hash = 0
	for (let i = 0; i < userId.length; i++) {
		hash = (hash * 31 + userId.charCodeAt(i)) | 0
	}
	return AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length]
}

function Avatar({
	profile,
	userId,
	visible,
}: {
	profile?: ChatUserProfile
	userId: string
	visible: boolean
}) {
	const initial = (profile?.name ?? profile?.username ?? '?')[0].toUpperCase()
	const hue = avatarHue(userId)

	return (
		<div
			className={`size-6 shrink-0 rounded-full overflow-hidden self-end ${visible ? '' : 'opacity-0'}`}
		>
			{profile?.avatar_url ? (
				<Image
					src={profile.avatar_url}
					alt=""
					width={24}
					height={24}
					className="size-full object-cover"
					unoptimized
				/>
			) : (
				<div
					className="size-full flex items-center justify-center text-[11px] font-semibold"
					style={{
						backgroundColor: `oklch(0.85 0.08 ${hue})`,
						color: `oklch(0.25 0.12 ${hue})`,
					}}
				>
					{initial}
				</div>
			)}
		</div>
	)
}

export default memo(function MessageBubble({
	message,
	isSent,
	isFirstInGroup,
	isLastInGroup,
	profile,
}: MessageBubbleProps) {
	const mediaUrl = message.media_url ?? ''
	const hasImage = !!message.media_url && isImageType(message.media_type)
	const hasFile = !!message.media_url && !isImageType(message.media_type)
	const radiusClass = isSent ? SENT_RADIUS : RECV_RADIUS
	const bgClass = isSent ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface'

	return (
		<div
			data-testid={`message-${message.id}`}
			className={`group relative flex items-end gap-2 ${isSent ? 'justify-end' : 'justify-start'}`}
		>
			{/* Avatar for received messages */}
			{!isSent && <Avatar profile={profile} userId={message.user_id} visible={isLastInGroup} />}

			<div className={`flex flex-col min-w-0 ${hasImage ? 'max-w-[300px]' : 'max-w-[80%]'}`}>
				{/* Sender name on first received message in group */}
				{!isSent && isFirstInGroup && profile && (
					<span className="text-label font-semibold text-on-surface-muted mb-1 ml-1">
						{profile.name ?? profile.username}
					</span>
				)}

				<div className={`overflow-hidden ${bgClass} ${radiusClass}`}>
					{/* Image fills the full bubble width, no padding */}
					{hasImage && (
						<Image
							src={mediaUrl}
							alt="Shared media"
							width={300}
							height={300}
							className="w-full h-auto max-h-[400px] object-cover"
							unoptimized
						/>
					)}

					{/* File attachment / text / timestamp — only render when there's content below the image */}
					<div className={hasFile || message.content ? 'px-3 py-2' : 'hidden'}>
						{hasFile && (
							<a
								href={mediaUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2 py-1 text-label text-on-surface-muted mb-1 hover:underline"
							>
								File attachment
							</a>
						)}

						{message.content && <p className="text-body whitespace-pre-wrap">{message.content}</p>}

						{isLastInGroup && (
							<div className="flex items-center justify-end gap-1.5 mt-1">
								<span data-testid="message-timestamp" className="text-label opacity-70">
									{formatTime(message.created_at)}
								</span>
								{isSent && message.status === 'pending' && (
									<span className="text-label opacity-60">Sending...</span>
								)}
								{isSent && message.status === 'failed' && (
									<span className="text-label text-error">Failed to send</span>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Hover action bar — below bubble */}
			<div
				className={`absolute -bottom-7 z-20 flex items-center gap-0.5 rounded-lg bg-surface-lowest shadow-resting px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isSent ? 'right-0' : 'left-8'}`}
			>
				<Button type="button" variant="ghost" size="icon-xs" aria-label="React">
					<Smile className="size-3.5" />
				</Button>
				<Button type="button" variant="ghost" size="icon-xs" aria-label="More options">
					<ChevronDown className="size-3.5" />
				</Button>
			</div>
		</div>
	)
})
