'use client'

import { AnimatePresence } from 'motion/react'
import { useCallback, useState } from 'react'

import ConversationPanel from '@/core/chat/ConversationPanel'
import { consumeAgentStream } from '@/core/chat/consumeAgentStream'
import { useConversationStore } from '@/core/chat/conversationStore'
import PromptInput from '@/core/chat/PromptInput'
import PromptInputMenu from '@/core/chat/PromptInputMenu'
import { sendMessage } from '@/core/chat/useAgentStream'
import { usePromptInputState } from '@/core/chat/usePromptInputState'

export default function AgentChat({ spaceId, userId }: { spaceId: string; userId: string }) {
	const state = usePromptInputState()
	const [menuOpen, setMenuOpen] = useState(false)
	const status = useConversationStore((s) => s.status)

	const handleSend = useCallback(async () => {
		if (!state.canSend) return
		const text = state.text.trim()
		state.reset()

		useConversationStore.getState().addUserTurn(text)

		try {
			const stream = await sendMessage({ spaceId, userId, message: text })
			await consumeAgentStream(stream)
		} catch (err) {
			useConversationStore
				.getState()
				.setError(err instanceof Error ? err.message : 'Failed to send message')
		}
	}, [state, spaceId, userId])

	const handleMenuClose = useCallback(() => setMenuOpen(false), [])

	return (
		<div className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
			<ConversationPanel />
			<AnimatePresence>
				{menuOpen && (
					<PromptInputMenu
						onClose={handleMenuClose}
						onAddItem={state.addContextItem}
						onUpdateItem={state.updateContextItem}
					/>
				)}
			</AnimatePresence>
			<PromptInput
				text={state.text}
				onTextChange={state.setText}
				onSend={handleSend}
				contextItems={state.contextItems}
				onAddContextItem={state.addContextItem}
				onUpdateContextItem={state.updateContextItem}
				onRemoveContextItem={state.removeContextItem}
				isGenerating={status === 'streaming'}
				onStop={() => {
					// TODO: abort controller to cancel SSE stream
				}}
				menuOpen={menuOpen}
				onMenuOpenChange={setMenuOpen}
			/>
		</div>
	)
}
