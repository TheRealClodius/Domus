'use client'

import { CornerDownLeft, Inbox, Trash2 } from 'lucide-react'
import { useDragEntity } from '@/core/canvas/useDragEntity'
import GrabHandle from '@/core/entity/GrabHandle'
import { useAgentGlow } from '@/core/entity/useAgentGlow'
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

export default function CanvasCard({ entity }: { entity: Entity }) {
	const glowing = useAgentGlow(entity)
	const setFocused = useEntityStore((s) => s.setFocused)
	const { bind: dragBind, isDragging } = useDragEntity(entity.id)

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Card focus requires onMouseDown on container
		<div
			data-testid="canvas-card"
			data-agent-glow={glowing ? '' : undefined}
			onMouseDown={() => setFocused(entity.id)}
			{...dragBind()}
			className={`group relative flex flex-col rounded-xl bg-surface-raised cursor-grab active:cursor-grabbing transition-shadow ${
				isDragging ? 'shadow-dragging' : 'shadow-resting'
			} ${glowing ? 'shadow-agent-glow' : ''}`}
			style={{ width: CARD_WIDTH, height: CARD_HEIGHT, touchAction: 'none', pointerEvents: 'auto' }}
		>
			{/* Hover action buttons */}
			<div
				data-testid="card-actions"
				className="absolute top-2 left-2 right-2 flex justify-between opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150"
			>
				<Button
					variant="pill-secondary"
					size="pill"
					aria-label="Expand"
					onClick={(e) => {
						e.stopPropagation()
						useSheetStore.getState().open(entity.id, 'entity')
					}}
				>
					<CornerDownLeft />
					Expand
				</Button>
				<div className="flex gap-1">
					<Button
						variant="pill-secondary"
						size="pill"
						aria-label="Move to inbox"
						onClick={(e) => {
							e.stopPropagation()
							// TODO: wire to inbox action
						}}
					>
						<Inbox />
					</Button>
					<Button
						variant="pill-secondary"
						size="pill"
						aria-label="Delete"
						onClick={(e) => {
							e.stopPropagation()
							// TODO: wire to delete/archive action
						}}
					>
						<Trash2 />
					</Button>
				</div>
			</div>

			{/* Content area */}
			<div className="flex-1 overflow-hidden pt-10 px-3 pb-3">
				<p className="font-display text-title-md text-on-surface mb-2">{entity.type}</p>
				<p className="text-body-sm text-on-surface line-clamp-6">{entity.summary}</p>
			</div>

			{/* Grab handle */}
			<div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150">
				<GrabHandle />
			</div>

			{/* Metadata row */}
			<div data-testid="card-metadata" className="px-3 pb-3 text-label text-on-surface-muted">
				{entity.type} · {relativeTime(entity.updated_at)}
			</div>
		</div>
	)
}
