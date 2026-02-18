'use client'

import ChatHeaderButtons from '@/apps/chat/ChatHeaderButtons'
import { useChatStore } from '@/apps/chat/chatStore'

export default function ChatWindowActions({ entityId: _ }: { entityId: string }) {
	const activeGroup = useChatStore((s) => {
		const id = s.activeGroupId
		return id ? s.groups.find((g) => g.id === id) : null
	})
	const activeSidebar = useChatStore((s) => s.sidebar)
	const store = useChatStore.getState

	// Modal values shouldn't activate header pills
	const mappedSidebar =
		activeSidebar === 'groups' || activeSidebar === 'settings' ? activeSidebar : null

	return (
		<ChatHeaderButtons
			activeGroupName={activeGroup?.name}
			activeSidebar={mappedSidebar}
			onToggleGroups={() => {
				const current = store().sidebar
				store().setSidebar(current === 'groups' ? null : 'groups')
			}}
			onToggleSettings={() => {
				const current = store().sidebar
				store().setSidebar(current === 'settings' ? null : 'settings')
			}}
		/>
	)
}
