'use client'

import { useCallback, useState } from 'react'

import PromptInput from '@/core/chat/PromptInput'
import PromptInputMenu from '@/core/chat/PromptInputMenu'
import { usePromptInputState } from '@/core/chat/usePromptInputState'

export default function AgentChat({
	spaceId: _spaceId,
	userId: _userId,
}: {
	spaceId: string
	userId: string
}) {
	const state = usePromptInputState()
	const [menuOpen, setMenuOpen] = useState(false)

	const handleSend = () => {
		if (!state.canSend) return
		// TODO: send message + context items to agent stream
		state.reset()
	}

	const handleMenuClose = useCallback(() => setMenuOpen(false), [])

	return (
		<div className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
			{menuOpen && (
				<PromptInputMenu
					onClose={handleMenuClose}
					onAddItem={state.addContextItem}
					onUpdateItem={state.updateContextItem}
				/>
			)}
			<PromptInput
				text={state.text}
				onTextChange={state.setText}
				onSend={handleSend}
				contextItems={state.contextItems}
				onAddContextItem={state.addContextItem}
				onUpdateContextItem={state.updateContextItem}
				onRemoveContextItem={state.removeContextItem}
				isGenerating={false}
				onStop={() => {}}
				menuOpen={menuOpen}
				onMenuOpenChange={setMenuOpen}
			/>
		</div>
	)
}
