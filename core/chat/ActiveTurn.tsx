import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import ActionChip from '@/core/chat/ActionChip'
import AgentMarkdown from '@/core/chat/AgentMarkdown'
import type { ToolCallEntry } from '@/core/chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'
import { SPRING } from '@/lib/motion'

const COALESCING_LABELS = [
	'Coalescing…',
	'Assembling…',
	'Gathering…',
	'Synthesizing…',
	'Composing…',
]

interface ActiveTurnProps {
	text: string
	toolCalls: ToolCallEntry[]
}

export default function ActiveTurn({ text, toolCalls }: ActiveTurnProps) {
	const setFocused = useEntityStore((s) => s.setFocused)
	const [labelIndex, setLabelIndex] = useState(0)

	const isEmpty = !text && toolCalls.length === 0

	useEffect(() => {
		if (!isEmpty) return
		const interval = setInterval(() => {
			setLabelIndex((i) => (i + 1) % COALESCING_LABELS.length)
		}, 2000)
		return () => clearInterval(interval)
	}, [isEmpty])

	return (
		<div className="flex flex-col gap-2">
			<AnimatePresence>
				{isEmpty && (
					<motion.div
						data-testid="coalescing-chip"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={SPRING.gentle}
						className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg bg-surface px-2.5 py-1 text-label text-on-surface-muted"
					>
						<span className="shimmer-sweep absolute inset-0" aria-hidden="true" />
						<span className="relative">{COALESCING_LABELS[labelIndex]}</span>
					</motion.div>
				)}
			</AnimatePresence>
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
