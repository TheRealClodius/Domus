'use client'

import PromptInput from '@/core/chat/PromptInput'
import { usePromptInputState } from '@/core/chat/usePromptInputState'

export default function AgentChat({
	spaceId: _spaceId,
	userId: _userId,
}: {
	spaceId: string
	userId: string
}) {
	const state = usePromptInputState()

	const handleSend = () => {
		if (!state.canSend) return
		// TODO: send message + context items to agent stream
		state.reset()
	}

	return (
		<div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
			<PromptInput
				text={state.text}
				onTextChange={state.setText}
				onSend={handleSend}
				contextItems={state.contextItems}
				onAddContextItem={state.addContextItem}
				onRemoveContextItem={state.removeContextItem}
				isGenerating={false}
				onStop={() => {}}
			/>
		</div>
	)
}
