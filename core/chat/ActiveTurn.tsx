import ActionChip from '@/core/chat/ActionChip'
import AgentMarkdown from '@/core/chat/AgentMarkdown'
import type { ToolCallEntry } from '@/core/chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'

interface ActiveTurnProps {
	text: string
	toolCalls: ToolCallEntry[]
}

export default function ActiveTurn({ text, toolCalls }: ActiveTurnProps) {
	const setFocused = useEntityStore((s) => s.setFocused)

	if (!text && toolCalls.length === 0) return null

	return (
		<div className="flex flex-col gap-2">
			{toolCalls.map((tc) => (
				<ActionChip
					key={tc.id}
					tool={tc.tool}
					status={tc.status}
					result={tc.result}
					args={tc.args}
					onFocusEntity={setFocused}
				/>
			))}
			{text && <AgentMarkdown>{text}</AgentMarkdown>}
		</div>
	)
}
