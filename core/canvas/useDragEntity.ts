import { useDrag } from '@use-gesture/react'
import { useRef, useState } from 'react'
import { useEntityStore } from '@/core/entityStore'

/**
 * Drag hook for entities (windows via title bar, cards via whole surface).
 * User drag is immediate per design pattern P6 — no spring animation.
 */
export function useDragEntity(entityId: string) {
	const updatePosition = useEntityStore((s) => s.updatePosition)
	const setFocused = useEntityStore((s) => s.setFocused)
	const startPos = useRef<{ x: number; y: number } | null>(null)
	const [isDragging, setIsDragging] = useState(false)

	const bind = useDrag(
		({ first, last, movement: [mx, my], event }) => {
			event?.stopPropagation()

			if (first) {
				setIsDragging(true)
				const entity = useEntityStore.getState().entities[entityId]
				if (!entity) return
				startPos.current = { x: entity.position.x, y: entity.position.y }
				setFocused(entityId)
			}

			if (!startPos.current) return

			updatePosition(entityId, {
				x: startPos.current.x + mx,
				y: startPos.current.y + my,
			})

			if (last) {
				setIsDragging(false)
				startPos.current = null
			}
		},
		{ filterTaps: true },
	)

	return { bind, isDragging }
}
