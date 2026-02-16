'use client'

import { AlertTriangle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import type { ContextItem } from '@/core/chat/usePromptInputState'
import { DURATION, MOTION_EASE } from '@/lib/motion'
import { cn } from '@/lib/utils'

function extractExtension(name: string): string {
	const dot = name.lastIndexOf('.')
	if (dot === -1) return ''
	return name
		.slice(dot + 1)
		.toUpperCase()
		.slice(0, 4)
}

const crossfade = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
}

export default function PromptInputChip({
	item,
	onRemove,
}: {
	item: ContextItem
	onRemove: (id: string) => void
}) {
	const isImage = item.type === 'image' || item.file.type.startsWith('image/')

	return (
		<div
			className={cn(
				'group relative shrink-0 overflow-hidden rounded-xl',
				item.status === 'error' && 'border border-error',
			)}
			style={{ width: 56, height: 45 }}
		>
			<AnimatePresence mode="wait">
				{item.status === 'loading' && (
					<motion.div
						key="loading"
						{...crossfade}
						transition={{ duration: DURATION.medium, ease: MOTION_EASE.smooth }}
						data-testid="chip-loading"
						className="absolute inset-0 animate-pulse"
						style={{
							background:
								'linear-gradient(135deg, var(--chip-loading-from), var(--chip-loading-to))',
							backdropFilter: 'blur(25px)',
						}}
					/>
				)}

				{item.status === 'error' && (
					<motion.div
						key="error"
						{...crossfade}
						transition={{ duration: DURATION.fast, ease: MOTION_EASE.smooth }}
						data-testid="chip-error"
						className="flex h-full w-full items-center justify-center"
						style={{ background: 'var(--chip-error-bg)' }}
					>
						<AlertTriangle size={16} className="text-error" />
					</motion.div>
				)}

				{item.status === 'ready' && isImage && item.preview && (
					<motion.div
						key="image"
						{...crossfade}
						transition={{ duration: DURATION.medium, ease: MOTION_EASE.smooth }}
						className="absolute inset-0 shadow-card"
					>
						{/* biome-ignore lint/performance/noImgElement: pre-sized data URL thumbnail — next/image optimization adds no value */}
						<img
							src={item.preview}
							alt={item.name}
							className="absolute inset-0 h-full w-full object-cover"
						/>
					</motion.div>
				)}

				{item.status === 'ready' && !isImage && (
					<motion.div
						key="extension"
						{...crossfade}
						transition={{ duration: DURATION.medium, ease: MOTION_EASE.smooth }}
						className="flex h-full w-full items-center justify-center"
						style={{
							background: 'var(--chip-document)',
							boxShadow: 'var(--chip-document-shadow)',
						}}
					>
						<span className="text-label font-medium text-on-surface">
							{extractExtension(item.name)}
						</span>
					</motion.div>
				)}
			</AnimatePresence>

			<button
				type="button"
				aria-label="Remove attachment"
				onClick={() => onRemove(item.id)}
				className="absolute inset-0 flex items-center justify-center rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
				style={{ background: 'var(--overlay-scrim)' }}
			>
				<X size={14} className="text-white" />
			</button>
		</div>
	)
}
