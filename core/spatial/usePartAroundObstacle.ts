/**
 * SPIKE CODE — throwaway, not production
 *
 * Hook: automatically parts entities around [data-chat-obstacle] when it
 * appears in the DOM, re-parts on resize, restores on removal.
 *
 * Always computes from the original snapshot — no compounding.
 */

import { type RefObject, useEffect, useRef } from 'react'
import { markParting } from '@/core/spatial/animationDirector'
import { useEntityStore } from '@/core/entityStore'
import { partAroundObstacle, unpartAroundObstacle } from '@/core/spatial/partAroundObstacle'
import type { Rect, Viewport } from '@/core/spatial/primitives'

interface EntitySnapshot {
	position: { x: number; y: number }
	size: { width: number; height: number }
	resizable: boolean
}

const OBSTACLE_SELECTOR = '[data-chat-obstacle]'

function getViewport(canvasRef: RefObject<HTMLDivElement | null>): Viewport {
	return {
		width: canvasRef.current?.clientWidth ?? window.innerWidth,
		height: canvasRef.current?.clientHeight ?? window.innerHeight,
	}
}

function getObstacleRect(element: Element, canvasEl: HTMLElement | null): Rect {
	const chatBounds = element.getBoundingClientRect()
	const canvasBounds = canvasEl?.getBoundingClientRect() ?? {
		left: 0,
		top: 0,
	}
	return {
		x: chatBounds.left - canvasBounds.left,
		y: chatBounds.top - canvasBounds.top,
		width: chatBounds.width,
		height: chatBounds.height,
	}
}

export function usePartAroundObstacle(canvasRef: RefObject<HTMLDivElement | null>): void {
	const snapshotRef = useRef<Map<string, EntitySnapshot> | null>(null)
	const resizeObserverRef = useRef<ResizeObserver | null>(null)
	const rafRef = useRef<number>(0)
	// Tracks entities the user moved/resized while parted — excluded from restore
	const userDirtyIds = useRef<Set<string>>(new Set())
	// Suppresses the subscription during the algorithm's own store writes
	const isAlgorithmWriting = useRef(false)

	// Subscribe to store position/size changes to detect user gestures while parted
	useEffect(() => {
		return useEntityStore.subscribe((state, prev) => {
			if (!snapshotRef.current || isAlgorithmWriting.current) return
			for (const id of snapshotRef.current.keys()) {
				const entity = state.entities[id]
				const prevEntity = prev.entities[id]
				if (!entity || !prevEntity) continue
				if (entity.position !== prevEntity.position || entity.size !== prevEntity.size) {
					userDirtyIds.current.add(id)
				}
			}
		})
	}, [])

	useEffect(() => {
		function takeSnapshot(): Map<string, EntitySnapshot> {
			const store = useEntityStore.getState()
			const snapshot = new Map<string, EntitySnapshot>()
			for (const e of Object.values(store.entities)) {
				if (e.presentation === 'hidden' || e.archived) continue
				snapshot.set(e.id, {
					position: { x: e.position.x, y: e.position.y },
					size: { width: e.size.width, height: e.size.height },
					resizable: e.presentation === 'window',
				})
			}
			return snapshot
		}

		function applyPart(obstacleElement: Element) {
			const snapshot = snapshotRef.current
			if (!snapshot) return

			const viewport = getViewport(canvasRef)
			const obstacle = getObstacleRect(obstacleElement, canvasRef.current)

			// Build entity map from snapshot (original positions), skip user-touched entities
			const entityMap = new Map<string, Rect & { resizable: boolean }>()
			for (const [id, snap] of snapshot) {
				if (userDirtyIds.current.has(id)) continue
				entityMap.set(id, {
					x: snap.position.x,
					y: snap.position.y,
					width: snap.size.width,
					height: snap.size.height,
					resizable: snap.resizable,
				})
			}

			const result = partAroundObstacle({
				entities: entityMap,
				obstacle,
				viewport,
			})

			const store = useEntityStore.getState()

			// Mark all affected entities for cinematic parting transition
			markParting([...snapshot.keys()])

			// Write to store — flag prevents subscription from treating these as user gestures
			isAlgorithmWriting.current = true
			// For every snapshotted entity: apply moved position if in result,
			// else restore to snapshot position/size; skip user-touched entities
			for (const [id, snap] of snapshot) {
				if (userDirtyIds.current.has(id)) continue
				const movedPos = result.movedEntities.get(id)
				const resizedSize = result.resizedEntities.get(id)
				if (movedPos) {
					store.updatePosition(id, movedPos)
				} else {
					store.updatePosition(id, snap.position)
				}
				if (resizedSize) {
					store.updateSize(id, resizedSize)
				} else {
					store.updateSize(id, snap.size)
				}
			}
			isAlgorithmWriting.current = false
		}

		function restoreAll() {
			const snapshot = snapshotRef.current
			if (!snapshot) return

			const dirty = userDirtyIds.current

			const { positions, sizes } = unpartAroundObstacle(
				new Map(Array.from(snapshot, ([id, s]) => [id, s.position])),
				new Map(Array.from(snapshot, ([id, s]) => [id, s.size])),
			)

			const store = useEntityStore.getState()
			markParting([...snapshot.keys()])
			isAlgorithmWriting.current = true
			for (const [id, pos] of positions) {
				if (dirty.has(id)) continue // user moved this — leave it
				store.updatePosition(id, pos)
			}
			for (const [id, size] of sizes) {
				if (dirty.has(id)) continue
				store.updateSize(id, size)
			}
			isAlgorithmWriting.current = false

			snapshotRef.current = null
			userDirtyIds.current = new Set()
		}

		function scheduleRecompute(obstacleElement: Element) {
			cancelAnimationFrame(rafRef.current)
			rafRef.current = requestAnimationFrame(() => {
				applyPart(obstacleElement)
			})
		}

		function attachResizeObserver(element: Element) {
			resizeObserverRef.current?.disconnect()
			const ro = new ResizeObserver(() => {
				scheduleRecompute(element)
			})
			ro.observe(element)
			resizeObserverRef.current = ro
		}

		function detachResizeObserver() {
			resizeObserverRef.current?.disconnect()
			resizeObserverRef.current = null
		}

		function onObstacleAppeared(element: Element) {
			snapshotRef.current = takeSnapshot()
			attachResizeObserver(element)
			applyPart(element)
		}

		function onObstacleRemoved() {
			detachResizeObserver()
			cancelAnimationFrame(rafRef.current)
			restoreAll()
		}

		// Check if obstacle already exists on mount
		const existing = document.querySelector(OBSTACLE_SELECTOR)
		if (existing) {
			onObstacleAppeared(existing)
		}

		// Watch for obstacle appearing/disappearing
		const mo = new MutationObserver(() => {
			const element = document.querySelector(OBSTACLE_SELECTOR)
			if (element && !snapshotRef.current) {
				onObstacleAppeared(element)
			} else if (!element && snapshotRef.current) {
				onObstacleRemoved()
			}
		})

		mo.observe(document.body, { childList: true, subtree: true })

		return () => {
			mo.disconnect()
			detachResizeObserver()
			cancelAnimationFrame(rafRef.current)
			// Don't restore on unmount — component is being torn down
			snapshotRef.current = null
			userDirtyIds.current = new Set()
		}
	}, [canvasRef])
}
