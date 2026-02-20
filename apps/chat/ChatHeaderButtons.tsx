import { memo } from 'react'
import { Button } from '@/core/ui/button'

interface ChatHeaderButtonsProps {
	activeGroupName?: string
	activeSidebar: 'groups' | 'settings' | null
	onToggleGroups: () => void
	onToggleSettings: () => void
}

export default memo(function ChatHeaderButtons({
	activeGroupName,
	activeSidebar,
	onToggleGroups,
	onToggleSettings,
}: ChatHeaderButtonsProps) {
	return (
		<div className="flex items-center justify-between w-full pointer-events-none">
			{/* Left group — primary nav actions */}
			<div className="flex items-center gap-2 pointer-events-auto">
				<Button
					variant={activeSidebar === 'groups' ? 'pill-active' : 'pill-base'}
					size="pill"
					onClick={onToggleGroups}
				>
					Chats
				</Button>
			</div>
			{/* Right group — secondary / context actions */}
			<div className="flex items-center gap-2 pointer-events-auto">
				{activeGroupName && (
					<Button
						variant={activeSidebar === 'settings' ? 'pill-active' : 'pill-base'}
						size="pill"
						onClick={onToggleSettings}
					>
						{activeGroupName}
					</Button>
				)}
			</div>
		</div>
	)
})
