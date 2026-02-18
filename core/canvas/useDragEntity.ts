import { useDrag } from '@use-gesture/react'
import { useCallback, useRef, useState } from 'react'
import { useEntityStore } from '@/core/entityStore'
import { markJustDragged } from '@/core/canvas/SpaceRenderer'

/**
 * Drag hook for entities (windows via title bar, cards via whole surface).
 *
 * During drag, DOM styles are mutated directly via RAF for 60fps performance.
 * The Zustand store is only updated on pointer up (batched commit).
 * Pattern mirrors useResizeEntity.
 */
export function useDragEntity(entityId: string) {
	const updatePosition = useEntityStore((s) => s.updatePosition)
	const setFocused = useEntityStore((s) => s.setFocused)
	const startPosRef = useRef<{ x: number; y: number } | null>(null)
	const latestRef = useRef<[number, number]>([0, 0])
	const rafRef = useRef(0)
	const wrapperRef = useRef<HTMLElement | null>(null)
	const [isDragging, setIsDragging] = useState(false)

	const dragTick = useCallback(() => {
		rafRef.current = 0
		const el = wrapperRef.current
		if (!el) return
		const [mx, my] = latestRef.current
		el.style.transform = `translate3d(${mx}px, ${my}px, 0)`
	}, [])

	const bind = useDrag(
		({ first, last, movement: [mx, my], event }) => {
			event?.stopPropagation()

			if (first) {
				setIsDragging(true)
				const entity = useEntityStore.getState().entities[entityId]
				if (!entity) return
				startPosRef.current = { x: entity.position.x, y: entity.position.y }
				setFocused(entityId)

				// Find the entity wrapper for direct DOM manipulation
				const target = event?.currentTarget as HTMLElement | undefined
				wrapperRef.current = target?.closest('[data-entity-wrapper]') as HTMLElement | null
				if (wrapperRef.current) {
					wrapperRef.current.style.willChange = 'transform'
				}

				document.body.style.cursor = 'grabbing'
				return
			}

			if (!startPosRef.current) return

			if (last) {
				// Cancel pending RAF
				if (rafRef.current) {
					cancelAnimationFrame(rafRef.current)
					rafRef.current = 0
				}

				// Clear direct DOM styles
				if (wrapperRef.current) {
					wrapperRef.current.style.transform = ''
					wrapperRef.current.style.willChange = ''
				}

				// Mark as just-dragged so SpaceRenderer skips position animation
				markJustDragged(entityId)

				// Batched commit to store
				updatePosition(entityId, {
					x: startPosRef.current.x + mx,
					y: startPosRef.current.y + my,
				})

				setIsDragging(false)
				startPosRef.current = null
				wrapperRef.current = null
				document.body.style.cursor = ''
				return
			}

			// Intermediate movement — RAF-throttled direct DOM
			latestRef.current = [mx, my]
			if (!rafRef.current) {
				rafRef.current = requestAnimationFrame(dragTick)
			}
		},
		{ filterTaps: true },
	)

	return { bind, isDragging }
}
