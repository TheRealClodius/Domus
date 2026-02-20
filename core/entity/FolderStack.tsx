'use client'

import { useDragEntity } from '@/core/canvas/useDragEntity'
import { useEntityStore } from '@/core/entityStore'

interface FolderStackProps {
	/** Primary entity ID for drag/focus */
	entityId: string
	/** Entity IDs in this group (used for count display) */
	entityIds: string[]
	/** Optional label shown below the stack */
	label?: string
	onClick?: () => void
}

const THUMBNAIL_WIDTH = 73
const THUMBNAIL_HEIGHT = 94

/** CSS rotations for each card in the stack (back-to-front) */
const ROTATIONS = ['-8.92deg', '1.95deg', '4.86deg']

export default function FolderStack({ entityId, entityIds, label, onClick }: FolderStackProps) {
	const count = Math.min(entityIds.length, 3)
	const setFocused = useEntityStore((s) => s.setFocused)
	const { bind: dragBind } = useDragEntity(entityId)

	return (
		<button
			type="button"
			data-testid="folder-stack"
			aria-label={label ? `${label} (${entityIds.length} items)` : `${entityIds.length} items`}
			onClick={onClick}
			onMouseDown={() => setFocused(entityId)}
			{...dragBind()}
			className="group flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing"
			style={{ width: 120, height: 120, pointerEvents: 'auto', touchAction: 'none' }}
		>
			<div className="relative" style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}>
				{Array.from({ length: count }).map((_, i) => (
					<div
						key={entityIds[i]}
						className="absolute inset-0 rounded-lg bg-surface-lowest shadow-card"
						style={{
							transform: `rotate(${ROTATIONS[i]})`,
							zIndex: i,
						}}
					>
						{/* Placeholder skeleton lines */}
						<div className="flex flex-col gap-1 p-2">
							<div className="h-1.5 w-10 rounded-xs bg-on-surface/10" />
							<div className="h-1.5 w-8 rounded-xs bg-on-surface/10" />
							<div className="h-1.5 w-12 rounded-xs bg-on-surface/10" />
						</div>
					</div>
				))}
			</div>
			{label && (
				<span className="text-label text-on-surface-muted group-hover:text-on-surface transition-colors">
					{label}
				</span>
			)}
		</button>
	)
}
