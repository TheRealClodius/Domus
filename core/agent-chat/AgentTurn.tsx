'use client'

import { memo } from 'react'
import ActionChip from '@/core/agent-chat/ActionChip'
import AgentMarkdown from '@/core/agent-chat/AgentMarkdown'
import type { ConversationTurn } from '@/core/agent-chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'

export default memo(function AgentTurn({ turn }: { turn: ConversationTurn }) {
	const setFocused = useEntityStore((s) => s.setFocused)
	return (
		<div className="flex flex-col gap-2">
			{turn.toolCalls.map((tc) => (
				<ActionChip
					key={tc.id}
					tool={tc.tool}
					status={tc.status}
					result={tc.result}
					onFocusEntity={setFocused}
				/>
			))}
			{turn.text && <AgentMarkdown>{turn.text}</AgentMarkdown>}
		</div>
	)
})
