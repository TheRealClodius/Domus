'use client'

import { ListPlus, Maximize2 } from 'lucide-react'
import { useDragEntity } from '@/core/canvas/useDragEntity'
import { useAgentGlow } from '@/core/entity/useAgentGlow'
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

export default function CanvasCard({ entity }: { entity: Entity }) {
	const glowing = useAgentGlow(entity)
	const { bind: dragBind } = useDragEntity(entity.id)

	return (
		<div
			data-testid="canvas-card"
			data-agent-glow={glowing ? '' : undefined}
			{...dragBind()}
			className={`group relative flex flex-col rounded-xl bg-surface-raised shadow-resting cursor-grab active:cursor-grabbing hover:shadow-elevated hover:-translate-y-px transition-shadow ${
				glowing ? 'shadow-agent-glow' : ''
			}`}
			style={{ width: CARD_WIDTH, height: CARD_HEIGHT, touchAction: 'none', pointerEvents: 'auto' }}
		>
			{/* Hover action buttons */}
			<div
				data-testid="card-actions"
				className="absolute top-2 right-2 flex gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150"
			>
				<Button
					variant="ghost"
					size="icon-xs"
					className="bg-surface/80 hover:bg-surface"
					aria-label="Add to context"
					onClick={(e) => {
						e.stopPropagation()
						// TODO: wire to agent context pinning
					}}
					onPointerDown={(e) => e.stopPropagation()}
				>
					<ListPlus />
				</Button>
				<Button
					variant="ghost"
					size="icon-xs"
					className="bg-surface/80 hover:bg-surface"
					aria-label="Maximize"
					onClick={(e) => {
						e.stopPropagation()
						// TODO: wire to bottom sheet expand
					}}
					onPointerDown={(e) => e.stopPropagation()}
				>
					<Maximize2 />
				</Button>
			</div>

			{/* Content area */}
			<div className="flex-1 overflow-hidden p-3">
				<p className="text-sm text-on-surface line-clamp-6">{entity.summary}</p>
			</div>

			{/* Metadata row */}
			<div data-testid="card-metadata" className="px-3 pb-3 text-label text-on-surface-muted">
				{entity.type} · {relativeTime(entity.updated_at)}
			</div>
		</div>
	)
}
