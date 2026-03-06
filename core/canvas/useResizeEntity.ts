import { useCallback, useEffect, useRef, useState } from 'react'
import { useEntityStore } from '@/core/entityStore'

export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export type ResizeBehavior = 'expanding' | 'contracting' | null

const MIN_WIDTH = 300
const MIN_HEIGHT = 200
const DRAG_THRESHOLD = 2

/**
 * Detect whether a resize is expanding or contracting based on the handle
 * direction and the movement deltas.
 * Returns null if total movement is below the threshold.
 * @param threshold – minimum |dx|+|dy| to register a direction (default 2).
 *   Pass a lower value (e.g. 0.5) for frame-to-frame instantaneous detection.
 */
export function detectBehavior(
	dir: ResizeDirection,
	mx: number,
	my: number,
	threshold = DRAG_THRESHOLD,
): ResizeBehavior {
	if (Math.abs(mx) + Math.abs(my) <= threshold) return null

	switch (dir) {
		case 'e':
			return mx > 0 ? 'expanding' : 'contracting'
		case 'w':
			return mx < 0 ? 'expanding' : 'contracting'
		case 's':
			return my > 0 ? 'expanding' : 'contracting'
		case 'n':
			return my < 0 ? 'expanding' : 'contracting'
		case 'se':
			return mx + my > 0 ? 'expanding' : 'contracting'
		case 'sw':
			return -mx + my > 0 ? 'expanding' : 'contracting'
		case 'ne':
			return mx - my > 0 ? 'expanding' : 'contracting'
		case 'nw':
			return -mx - my > 0 ? 'expanding' : 'contracting'
	}
}

interface ResizeSnapshot {
	startX: number
	startY: number
	startWidth: number
	startHeight: number
	startPosX: number
	startPosY: number
	direction: ResizeDirection
}

/**
 * Resize hook using raw pointer events + requestAnimationFrame.
 *
 * During resize, DOM styles are mutated directly for 60fps performance.
 * The Zustand store is only updated on pointer up (batched commit).
 */
export function useResizeEntity(
	entityId: string,
	windowRef: React.RefObject<HTMLDivElement | null>,
) {
	const updatePosition = useEntityStore((s) => s.updatePosition)
	const updateSize = useEntityStore((s) => s.updateSize)

	const [isResizing, setIsResizing] = useState(false)
	const [activeDirection, setActiveDirection] = useState<ResizeDirection | null>(null)
	const [resizeBehavior, setResizeBehavior] = useState<ResizeBehavior>(null)

	const snapshotRef = useRef<ResizeSnapshot | null>(null)
	const latestPointerRef = useRef({ x: 0, y: 0 })
	const prevTickPosRef = useRef({ x: 0, y: 0 })
	const rafIdRef = useRef(0)
	const finalRef = useRef({ width: 0, height: 0, x: 0, y: 0 })
	const parentRef = useRef<HTMLElement | null>(null)
	// P2-B: capture attached listener references at bind time so removeEventListener
	// uses the exact same function references regardless of callback re-creation.
	const attachedMoveRef = useRef<((e: PointerEvent) => void) | null>(null)
	const attachedUpRef = useRef<((e: PointerEvent) => void) | null>(null)
	// P3-A: track last emitted behavior to avoid setState on every RAF frame.
	const lastBehaviorRef = useRef<ResizeBehavior>(null)

	// P1-A/B: Clean up body styles and pending RAF if entity unmounts mid-resize.
	useEffect(
		() => () => {
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
			if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
		},
		[],
	)

	const resizeTick = useCallback(() => {
		rafIdRef.current = 0
		const snap = snapshotRef.current
		const el = windowRef.current
		if (!snap || !el) return

		const mx = latestPointerRef.current.x - snap.startX
		const my = latestPointerRef.current.y - snap.startY
		const dir = snap.direction

		let newWidth = snap.startWidth
		let newHeight = snap.startHeight
		let newX = snap.startPosX
		let newY = snap.startPosY

		// Horizontal component
		if (dir.includes('e')) newWidth = snap.startWidth + mx
		if (dir.includes('w')) {
			newWidth = snap.startWidth - mx
			newX = snap.startPosX + mx
		}

		// Vertical component
		if (dir.includes('s')) newHeight = snap.startHeight + my
		if (dir.includes('n')) {
			newHeight = snap.startHeight - my
			newY = snap.startPosY + my
		}

		// Clamp to minimums
		const clampedW = Math.max(newWidth, MIN_WIDTH)
		const clampedH = Math.max(newHeight, MIN_HEIGHT)

		// Adjust position if size was clamped on left/top edges
		if (dir.includes('w') && clampedW !== newWidth) {
			newX = snap.startPosX + snap.startWidth - clampedW
		}
		if (dir.includes('n') && clampedH !== newHeight) {
			newY = snap.startPosY + snap.startHeight - clampedH
		}

		// Direct DOM mutation for performance
		el.style.width = `${clampedW}px`
		el.style.height = `${clampedH}px`

		// Offset the parent wrapper via transform so left/top stay in sync with
		// the Zustand store.  Cleared on pointer-up before the batched commit.
		if (parentRef.current && (dir.includes('w') || dir.includes('n'))) {
			const dx = newX - snap.startPosX
			const dy = newY - snap.startPosY
			parentRef.current.style.transform = `translate(${dx}px, ${dy}px)`
		}

		// Store final values for batched commit on pointer up
		finalRef.current = { width: clampedW, height: clampedH, x: newX, y: newY }

		// Instantaneous direction detection — frame-to-frame deltas respond
		// immediately to direction reversals (OS1 "breathing" behavior).
		const frameDx = latestPointerRef.current.x - prevTickPosRef.current.x
		const frameDy = latestPointerRef.current.y - prevTickPosRef.current.y
		prevTickPosRef.current = { x: latestPointerRef.current.x, y: latestPointerRef.current.y }
		const behavior = detectBehavior(dir, frameDx, frameDy, 0.5)
		// P3-A: only call setState when behavior actually changes to avoid re-renders every frame.
		if (behavior !== null && behavior !== lastBehaviorRef.current) {
			lastBehaviorRef.current = behavior
			setResizeBehavior(behavior)
		}
	}, [windowRef])

	const handlePointerMove = useCallback(
		(e: PointerEvent) => {
			latestPointerRef.current = { x: e.clientX, y: e.clientY }
			if (!rafIdRef.current) {
				rafIdRef.current = requestAnimationFrame(resizeTick)
			}
		},
		[resizeTick],
	)

	const handlePointerUp = useCallback(
		(e: PointerEvent) => {
			const target = e.currentTarget as HTMLElement
			// P2-B: remove using the exact refs captured at attach time.
			if (attachedMoveRef.current) {
				target.removeEventListener('pointermove', attachedMoveRef.current)
				attachedMoveRef.current = null
			}
			if (attachedUpRef.current) {
				target.removeEventListener('pointerup', attachedUpRef.current)
				attachedUpRef.current = null
			}
			target.releasePointerCapture(e.pointerId)

			if (rafIdRef.current) {
				cancelAnimationFrame(rafIdRef.current)
				rafIdRef.current = 0
			}

			// Clear transform offset before committing so React re-renders with
			// correct left/top from the store, avoiding desync.
			if (parentRef.current) {
				parentRef.current.style.transform = ''
			}

			// Batched commit to Zustand store — skipAnimation suppresses snap-back
			const { width, height, x, y } = finalRef.current
			if (width && height) {
				updateSize(entityId, { width, height }, true)
				updatePosition(entityId, { x, y }, true)
			}

			setIsResizing(false)
			setActiveDirection(null)
			setResizeBehavior(null)
			lastBehaviorRef.current = null
			snapshotRef.current = null
			document.body.style.cursor = ''
			document.body.style.userSelect = ''
		},
		[entityId, updatePosition, updateSize],
	)

	const getHandleProps = useCallback(
		(dir: ResizeDirection) => ({
			onPointerDown: (e: React.PointerEvent) => {
				const entity = useEntityStore.getState().entities[entityId]
				if (!entity) return

				e.preventDefault()
				e.stopPropagation()

				const target = e.currentTarget as HTMLElement
				target.setPointerCapture(e.pointerId)
				// P2-B: capture the current function references before attaching so
				// removeEventListener in handlePointerUp uses the exact same refs.
				attachedMoveRef.current = handlePointerMove
				attachedUpRef.current = handlePointerUp
				target.addEventListener('pointermove', handlePointerMove)
				target.addEventListener('pointerup', handlePointerUp)

				snapshotRef.current = {
					startX: e.clientX,
					startY: e.clientY,
					startWidth: entity.size.width,
					startHeight: entity.size.height,
					startPosX: entity.position.x,
					startPosY: entity.position.y,
					direction: dir,
				}

				latestPointerRef.current = { x: e.clientX, y: e.clientY }
				prevTickPosRef.current = { x: e.clientX, y: e.clientY }
				finalRef.current = {
					width: entity.size.width,
					height: entity.size.height,
					x: entity.position.x,
					y: entity.position.y,
				}

				// Capture the motion.div wrapper (handle → Window div → motion.div)
				// for transform offset during resize, without referencing windowRef.
				const handle = e.currentTarget as HTMLElement
				parentRef.current = handle.parentElement?.parentElement ?? null

				setIsResizing(true)
				setActiveDirection(dir)
				setResizeBehavior(null)

				document.body.style.userSelect = 'none'

				// Set cursor on body to persist during drag
				const cursors: Record<string, string> = {
					n: 'ns-resize',
					s: 'ns-resize',
					e: 'ew-resize',
					w: 'ew-resize',
					ne: 'nesw-resize',
					sw: 'nesw-resize',
					nw: 'nwse-resize',
					se: 'nwse-resize',
				}
				document.body.style.cursor = cursors[dir]
			},
		}),
		[entityId, handlePointerMove, handlePointerUp],
	)

	return { getHandleProps, activeDirection, resizeBehavior, isResizing }
}
