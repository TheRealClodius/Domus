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
			className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-surface-sunken ${
				isActive ? 'bg-surface-sunken' : ''
			}`}
		>
			{/* Avatar */}
			{group.avatar_url ? (
				<img
					src={group.avatar_url}
					alt={group.name}
					className="size-10 rounded-full object-cover shrink-0"
				/>
			) : (
				<div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-body font-medium">
					{group.name.charAt(0).toUpperCase()}
				</div>
			)}

			{/* Name + preview */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between gap-2">
					<p className="text-body font-medium text-on-surface truncate">{group.name}</p>
					{timestamp && (
						<span className="text-label text-on-surface-muted shrink-0">{timestamp}</span>
					)}
				</div>
				{preview && (
					<p className="text-label text-on-surface-muted truncate">{preview}</p>
				)}
			</div>

			{/* Unread badge */}
			{unreadCount > 0 && (
				<span
					data-testid="unread-badge"
					className="shrink-0 flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-on-primary text-label px-1.5"
				>
					{unreadCount}
				</span>
			)}
		</button>
	)
})
