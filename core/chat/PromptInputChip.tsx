'use client'

import { AlertTriangle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Image from 'next/image'

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
				'group relative shrink-0 overflow-hidden rounded',
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
							background: 'linear-gradient(135deg, rgba(145,162,190,0.53), rgba(224,171,163,0.53))',
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
						style={{ background: 'rgba(255,204,0,0.12)' }}
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
						<Image src={item.preview} alt={item.name} fill className="object-cover" />
					</motion.div>
				)}

				{item.status === 'ready' && !isImage && (
					<motion.div
						key="extension"
						{...crossfade}
						transition={{ duration: DURATION.medium, ease: MOTION_EASE.smooth }}
						className="flex h-full w-full items-center justify-center"
						style={{
							background: '#71cdff',
							boxShadow: '0 2px 8px rgba(0,145,224,0.25)',
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
				className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
				style={{ backdropFilter: 'blur(4px)' }}
			>
				<div className="flex items-center justify-center rounded-[4px] bg-surface-glass p-1">
					<X size={12} className="text-on-surface" />
				</div>
			</button>
		</div>
	)
}
