import ActionChip from '@/core/chat/ActionChip'
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
					onFocusEntity={setFocused}
				/>
			))}
			{text && <p className="text-body text-on-surface whitespace-pre-wrap">{text}</p>}
		</div>
	)
}
