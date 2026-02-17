'use client'

import ChatHeaderButtons from '@/apps/chat/ChatHeaderButtons'
import { useChatStore } from '@/apps/chat/chatStore'

export default function ChatWindowActions({ entityId: _ }: { entityId: string }) {
	const activeGroup = useChatStore((s) => {
		const id = s.activeGroupId
		return id ? s.groups.find((g) => g.id === id) : null
	})
	const store = useChatStore.getState

	return (
		<ChatHeaderButtons
			activeGroupName={activeGroup?.name}
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
