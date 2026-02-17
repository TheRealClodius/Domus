import { memo } from 'react'
import { Button } from '@/core/ui/button'

interface ChatHeaderButtonsProps {
	activeGroupName?: string
	onToggleGroups: () => void
	onToggleSettings: () => void
}

export default memo(function ChatHeaderButtons({
	activeGroupName,
	onToggleGroups,
	onToggleSettings,
}: ChatHeaderButtonsProps) {
	return (
		<>
			<Button variant="pill-base" size="pill" onClick={onToggleGroups}>
				Chats
			</Button>
			{activeGroupName && (
				<Button variant="pill-base" size="pill" onClick={onToggleSettings}>
					{activeGroupName}
				</Button>
			)}
		</>
	)
})
