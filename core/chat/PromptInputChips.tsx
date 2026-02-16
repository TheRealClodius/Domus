'use client'

import { Paperclip } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import PromptInputChip from '@/core/chat/PromptInputChip'
import type { ContextItem } from '@/core/chat/usePromptInputState'
import { SPRING } from '@/lib/motion'

export default function PromptInputChips({
	items,
	onRemove,
	isDragOver,
}: {
	items: ContextItem[]
	onRemove: (id: string) => void
	isDragOver: boolean
}) {
	if (items.length === 0 && !isDragOver) return null

	return (
		<div className="flex flex-wrap gap-1">
			<AnimatePresence mode="popLayout">
				{items.map((item) => (
					<motion.div
						key={item.id}
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={SPRING.popIn}
					>
						<PromptInputChip item={item} onRemove={onRemove} />
					</motion.div>
				))}
				{isDragOver && (
					<motion.div
						key="drag-target"
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={SPRING.popIn}
					>
						<div
							className="flex shrink-0 items-center justify-center rounded"
							style={{ width: 56, height: 45, background: '#273139' }}
						>
							<Paperclip size={16} className="text-white" />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
