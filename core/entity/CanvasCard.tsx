'use client'

import { Maximize2, MessageSquarePlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { getAppType } from '@/apps/_registry'
import { useDragEntity } from '@/core/canvas/useDragEntity'
import { useChatContextBridge } from '@/core/chat/chatContextBridge'
import AppRenderer from '@/core/entity/AppRenderer'
import GrabHandle from '@/core/entity/GrabHandle'
import { useAgentGlow } from '@/core/entity/useAgentGlow'
import WarmShimmer from '@/core/entity/WarmShimmer'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import { Button } from '@/core/ui/button'
import type { Entity } from '@/lib/types'

/** Fixed card dimensions per DESIGN-DIRECTION */
const CARD_WIDTH = 232
const CARD_HEIGHT = 300

function relativeTime(iso: string): string {
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
	if (seconds < 60) return 'just now'
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	const days = Math.floor(hours / 24)
	return `${days}d ago`
}

export default function CanvasCard({
	entity,
	isFocused = false,
	interactive = true,
}: {
	entity: Entity
	isFocused?: boolean
	interactive?: boolean
}) {
	const isPending = entity.state?._pending === true
	const glowing = useAgentGlow({ ...entity, forcePending: isPending })
	const setFocused = useEntityStore((s) => s.setFocused)
	const archive = useEntityStore((s) => s.archive)
	const toggleSelected = useEntityStore((s) => s.toggleSelected)
	const isSelected = useEntityStore((s) => s.selectedIds.has(entity.id))
	const { bind: dragBind, isDragging } = useDragEntity(entity.id)
	const [imageLoaded, setImageLoaded] = useState(false)
	const isImage =
		!isPending && entity.type === 'image' && !!(entity.state?.image_url || entity.state?.src)
	const hasApp = !isPending && !isImage && !!getAppType(entity.type)

	const shadowClass = isDragging
		? 'shadow-dragging'
		: isFocused
			? 'shadow-focused'
			: 'shadow-resting'

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Card focus requires onMouseDown on container
		<div
			data-testid="canvas-card"
			data-agent-glow={glowing ? '' : undefined}
			onMouseDown={(e) => {
				if (e.shiftKey) {
					toggleSelected(entity.id)
				} else {
					setFocused(entity.id)
				}
			}}
			{...dragBind()}
			className={`group relative flex flex-col rounded-xl bg-surface-lowest cursor-grab active:cursor-grabbing transition-shadow ${shadowClass} ${glowing ? 'shadow-agent-glow' : ''} ${isSelected ? 'outline-selection' : ''}`}
			style={{
				width: CARD_WIDTH,
				height: CARD_HEIGHT,
				touchAction: 'none',
				pointerEvents: interactive ? 'auto' : 'none',
			}}
		>
			{/* Hover action buttons */}
			<div
				data-testid="card-actions"
				className="absolute top-2 left-2 right-2 z-10 flex justify-between opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150"
			>
				<Button
					variant="pill-secondary"
					size="pill"
					aria-label="Add to chat"
					onClick={(e) => {
						e.stopPropagation()
						useChatContextBridge.getState().addEntityToChat(entity)
					}}
				>
					<MessageSquarePlus />
				</Button>
				<div className="flex gap-1">
					<Button
						variant="pill-secondary"
						size="pill"
						aria-label="Expand"
						onClick={(e) => {
							e.stopPropagation()
							useSheetStore.getState().open(entity.id, 'entity')
						}}
					>
						<Maximize2 />
					</Button>
					<Button
						variant="pill-secondary"
						size="pill"
						aria-label="Delete"
						onClick={(e) => {
							e.stopPropagation()
							archive(entity.id)
						}}
					>
						<Trash2 />
					</Button>
				</div>
			</div>

			{/* Content area */}
			{isPending ? (
				<div className="flex-1 overflow-hidden rounded-t-xl">
					<WarmShimmer label="Generating..." />
				</div>
			) : isImage ? (
				<div className="absolute inset-0 overflow-hidden rounded-xl">
					{!imageLoaded && <WarmShimmer />}
					{/* biome-ignore lint/performance/noImgElement: canvas cards use raw URLs from user state */}
					<img
						src={(entity.state.image_url ?? entity.state.src) as string}
						alt={(entity.state.generation_prompt as string) || entity.summary || 'Generated image'}
						className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
						data-testid="card-image"
						draggable={false}
						onLoad={() => setImageLoaded(true)}
					/>
				</div>
			) : hasApp ? (
				<div className="flex-1 overflow-hidden" data-testid="app-renderer-card">
					<AppRenderer entity={entity} mode="card" />
				</div>
			) : (
				<div className="flex-1 overflow-hidden pt-10 px-3 pb-3">
					<p className="font-display text-title-md text-on-surface mb-2">{entity.type}</p>
					<p className="text-body-sm text-on-surface line-clamp-6">{entity.summary}</p>
				</div>
			)}

			{/* Grab handle */}
			<div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150">
				<GrabHandle />
			</div>

			{/* Metadata row — overlaid with gradient scrim for image cards */}
			<div
				data-testid="card-metadata"
				className={
					isImage
						? 'absolute bottom-0 left-0 right-0 z-10 rounded-b-xl bg-gradient-to-t from-black/50 to-transparent px-3 pb-3 pt-6 text-label text-white'
						: 'px-3 pb-3 text-label text-on-surface-muted'
				}
			>
				{entity.type} · {relativeTime(entity.updated_at)}
			</div>
		</div>
	)
}
