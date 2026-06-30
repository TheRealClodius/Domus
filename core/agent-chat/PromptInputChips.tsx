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
						transition={{ duration: 0.2 }}
					>
						<div
							className="flex shrink-0 items-center justify-center rounded bg-surface-glass"
							style={{
								width: 56,
								height: 45,
								backdropFilter: 'blur(25px)',
							}}
						>
							<Paperclip size={24} className="text-on-surface-variant" />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
