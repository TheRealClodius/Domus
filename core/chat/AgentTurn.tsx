'use client'

import { ChevronDown } from 'lucide-react'
import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import ActionChip from '@/core/chat/ActionChip'
import AgentMarkdown from '@/core/chat/AgentMarkdown'
import type { ConversationTurn } from '@/core/chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'

export default memo(function AgentTurn({ turn }: { turn: ConversationTurn }) {
	const [expanded, setExpanded] = useState(false)
	const setFocused = useEntityStore((s) => s.setFocused)

	return (
		<div className="flex flex-col gap-1">
			<button
				type="button"
				onClick={() => setExpanded((p) => !p)}
				aria-expanded={expanded}
				className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-body text-on-surface transition-colors hover:bg-surface"
			>
				<ChevronDown
					size={14}
					className="shrink-0 text-on-surface-muted transition-transform"
					style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
				/>
				<span className="agent-markdown text-on-surface-muted">
					<ReactMarkdown components={{ p: 'span' }}>
						{turn.summary ?? 'Agent responded'}
					</ReactMarkdown>
				</span>
			</button>

			{expanded && (
				<div className="flex flex-col gap-2 px-3">
					{turn.text && <AgentMarkdown>{turn.text}</AgentMarkdown>}
					{turn.toolCalls.map((tc) => (
						<ActionChip
							key={tc.id}
							tool={tc.tool}
							status={tc.status}
							result={tc.result}
							onFocusEntity={setFocused}
						/>
					))}
				</div>
			)}
		</div>
	)
})
