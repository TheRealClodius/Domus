import Image from 'next/image'
import { memo } from 'react'
import type { ChatGroup } from '@/apps/chat/types'
import { cn } from '@/lib/utils'

interface GroupListItemProps {
	group: ChatGroup
	onClick: () => void
	isActive?: boolean
	unreadCount?: number
	preview?: string
	timestamp?: string
}

export default memo(function GroupListItem({
	group,
	onClick,
	isActive = false,
	unreadCount = 0,
	preview,
	timestamp,
}: GroupListItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'flex w-full items-start gap-2 rounded-lg p-3 text-left transition-colors hover:bg-on-surface/8',
				isActive && 'bg-surface-bright',
			)}
		>
			{/* image-container */}
			<div className="flex self-stretch shrink-0">
				{/* group-image-circular-mask */}
				<div className="size-[47px] rounded-full shadow-card overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
					{group.avatar_url ? (
						<Image
							src={group.avatar_url}
							alt={group.name}
							width={47}
							height={47}
							className="size-full object-cover"
							unoptimized
						/>
					) : (
						<span className="text-body font-medium text-primary">
							{group.name.charAt(0).toUpperCase()}
						</span>
					)}
				</div>
			</div>

			{/* descriptor-group */}
			<div className="flex flex-1 flex-col gap-1 min-w-0">
				{/* text-wrap */}
				<div className="flex flex-col gap-1">
					{/* group-title */}
					<p className="text-[14px] font-semibold leading-5 text-on-surface truncate">
						{group.name}
					</p>
					{/* text-description */}
					{preview && (
						<p className="text-[14px] leading-[18px] text-on-surface-muted line-clamp-2">
							{preview}
						</p>
					)}
				</div>

				{/* chin */}
				{(timestamp || unreadCount > 0) && (
					<div className="flex items-center justify-between">
						{/* last-sent-message */}
						<span className="text-[12px] text-on-surface-muted">{timestamp}</span>
						{/* unread-messages-pill */}
						{unreadCount > 0 && (
							<div
								data-testid="unread-badge"
								className="flex h-5 w-[34px] items-center justify-center rounded-full bg-primary shrink-0"
							>
								<span className="text-[12px] font-semibold text-on-primary">{unreadCount}</span>
							</div>
						)}
					</div>
				)}
			</div>
		</button>
	)
})
