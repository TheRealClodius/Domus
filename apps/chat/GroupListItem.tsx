import Image from 'next/image'
import { memo } from 'react'
import type { ChatGroup } from '@/apps/chat/types'

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
			className={`flex items-center gap-[13px] w-full px-4 py-3 rounded-xl text-left transition-colors hover:bg-surface-sunken ${isActive ? 'bg-surface-sunken' : ''}`}
		>
			{/* Avatar */}
			{group.avatar_url ? (
				<Image
					src={group.avatar_url}
					alt={group.name}
					width={47}
					height={47}
					className="size-[47px] rounded-full object-cover shrink-0"
					unoptimized
				/>
			) : (
				<div className="size-[47px] rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-body font-medium">
					{group.name.charAt(0).toUpperCase()}
				</div>
			)}

			{/* Name + preview + timestamp */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-2">
					<p className="text-[14px] font-semibold text-on-surface truncate">{group.name}</p>
					{unreadCount > 0 && (
						<span
							data-testid="unread-badge"
							className="shrink-0 flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-on-primary text-[12px] px-1.5"
						>
							{unreadCount}
						</span>
					)}
				</div>
				{preview && <p className="text-body text-on-surface-muted line-clamp-2">{preview}</p>}
				{timestamp && <span className="text-[12px] text-on-surface-muted">{timestamp}</span>}
			</div>
		</button>
	)
})
