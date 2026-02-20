/**
 * SPIKE CODE — throwaway, not production
 *
 * Recipe: Obstacle-Aware Parting (Reversible)
 * Two-pass algorithm:
 *   Pass 1 — Escape: translate clusters clear + scale to fit + shrink windows if needed
 *   Pass 2 — Readability: grow windows into available space
 *
 * Works with any rectangular obstacle (chat panel, sidebar, dialog, dock).
 * Split heuristic auto-detects from obstacle aspect ratio:
 *   wide obstacle → split left/right (by X)
 *   tall obstacle → split top/bottom (by Y)
 *
 * // TODO: multi-obstacle — call partAroundObstacle sequentially per obstacle for now
 */

import type { Rect, Viewport } from './primitives'
import {
	boundingBox,
	clampToViewport,
	findZoneOverlaps,
	nudge,
	rectsOverlap,
	VIEWPORT_INSET,
} from './primitives'

const PARTING_PADDING = VIEWPORT_INSET
const MIN_WINDOW_WIDTH = 300
const MIN_WINDOW_HEIGHT = 200
const MIN_CLUSTER_SCALE = 0.5
const MIN_ENTITY_GAP = 8

interface EntityRect extends Rect {
	resizable: boolean
}

interface PartInput {
	entities: Map<string, EntityRect>
	obstacle: Rect
	viewport: Viewport
	/** Padding around the obstacle (default: VIEWPORT_INSET) */
	padding?: number
}

interface PartResult {
	movedEntities: Map<string, { x: number; y: number }>
	resizedEntities: Map<string, { width: number; height: number }>
	savedPositions: Map<string, { x: number; y: number }>
	savedSizes: Map<string, { width: number; height: number }>
}

interface EscapeVector {
	dx: number
	dy: number
	axis: 'x' | 'y'
	dist: number
}

function findEscapeVectors(clusterBBox: Rect, obstacle: Rect, _viewport: Viewport): EscapeVector[] {
	const candidates: EscapeVector[] = []

	const dxLeft = obstacle.x - PARTING_PADDING - (clusterBBox.x + clusterBBox.width)
	candidates.push({ dx: dxLeft, dy: 0, axis: 'x', dist: Math.abs(dxLeft) })

	const dxRight = obstacle.x + obstacle.width + PARTING_PADDING - clusterBBox.x
	candidates.push({ dx: dxRight, dy: 0, axis: 'x', dist: Math.abs(dxRight) })

	const dyUp = obstacle.y - PARTING_PADDING - (clusterBBox.y + clusterBBox.height)
	candidates.push({ dx: 0, dy: dyUp, axis: 'y', dist: Math.abs(dyUp) })

	const dyDown = obstacle.y + obstacle.height + PARTING_PADDING - clusterBBox.y
	candidates.push({ dx: 0, dy: dyDown, axis: 'y', dist: Math.abs(dyDown) })

	return candidates.sort((a, b) => a.dist - b.dist)
}

function escapeWouldFit(clusterBBox: Rect, escapeVec: EscapeVector, viewport: Viewport): boolean {
	const shifted = {
		x: clusterBBox.x + escapeVec.dx,
		y: clusterBBox.y + escapeVec.dy,
		width: clusterBBox.width,
		height: clusterBBox.height,
	}
	// Check against VIEWPORT_INSET — must match what applyClusterTransform
	// group clamp actually enforces, otherwise escape approves positions
	// that downstream clamp will push back into the obstacle
	return (
		shifted.x >= VIEWPORT_INSET &&
		shifted.y >= VIEWPORT_INSET &&
		shifted.x + shifted.width <= viewport.width - VIEWPORT_INSET &&
		shifted.y + shifted.height <= viewport.height - VIEWPORT_INSET
	)
}

/** Compute cluster centroid (center of all entity centers) */
function clusterCenter(entries: [string, EntityRect][]): { cx: number; cy: number } {
	let cx = 0
	let cy = 0
	for (const [, r] of entries) {
		cx += r.x + r.width / 2
		cy += r.y + r.height / 2
	}
	return { cx: cx / entries.length, cy: cy / entries.length }
}

/**
 * Apply (dx, dy, scale) to a cluster.
 * Each entity's position is recomputed as:
 *   newCenter = clusterCenter + (originalOffset * scale) + (dx, dy)
 * Scale < 1 compresses internal spacing. Scale = 1 is pure translation.
 */
function applyClusterTransform(
	entries: [string, EntityRect][],
	escapeVec: EscapeVector,
	scale: number,
	viewport: Viewport,
): Map<string, { x: number; y: number }> {
	const positions = new Map<string, { x: number; y: number }>()
	const center = clusterCenter(entries)

	for (const [id, r] of entries) {
		const entityCenterX = r.x + r.width / 2
		const entityCenterY = r.y + r.height / 2

		const offsetX = (entityCenterX - center.cx) * scale
		const offsetY = (entityCenterY - center.cy) * scale

		const newCenterX = center.cx + offsetX + escapeVec.dx
		const newCenterY = center.cy + offsetY + escapeVec.dy

		positions.set(id, {
			x: newCenterX - r.width / 2,
			y: newCenterY - r.height / 2,
		})
	}

	// Post-transform: clamp the whole cluster into viewport as a group
	// (shift all entities by the same offset so relative positions are preserved)
	const entryMap = new Map(entries)
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const [id, pos] of positions) {
		const r = entryMap.get(id)
		if (!r) continue
		minX = Math.min(minX, pos.x)
		minY = Math.min(minY, pos.y)
		maxX = Math.max(maxX, pos.x + r.width)
		maxY = Math.max(maxY, pos.y + r.height)
	}

	let shiftX = 0
	let shiftY = 0
	if (minX < VIEWPORT_INSET) shiftX = VIEWPORT_INSET - minX
	else if (maxX > viewport.width - VIEWPORT_INSET) shiftX = viewport.width - VIEWPORT_INSET - maxX
	if (minY < VIEWPORT_INSET) shiftY = VIEWPORT_INSET - minY
	else if (maxY > viewport.height - VIEWPORT_INSET) shiftY = viewport.height - VIEWPORT_INSET - maxY

	if (shiftX !== 0 || shiftY !== 0) {
		for (const [id, pos] of positions) {
			positions.set(id, { x: pos.x + shiftX, y: pos.y + shiftY })
		}
	}

	return positions
}

/**
 * Compute what scale factor would make the cluster fit in available space
 * after translation along the given escape vector.
 */
function computeFitScale(clusterBBox: Rect, escapeVec: EscapeVector, viewport: Viewport): number {
	const shifted = {
		x: clusterBBox.x + escapeVec.dx,
		y: clusterBBox.y + escapeVec.dy,
		width: clusterBBox.width,
		height: clusterBBox.height,
	}

	let scaleX = 1
	let scaleY = 1

	// Use full viewport for scale planning — inset enforced by post-clamp
	if (shifted.x < 0 && clusterBBox.width > 0) {
		const available = clusterBBox.width + shifted.x // how much width fits
		scaleX = Math.max(MIN_CLUSTER_SCALE, available / clusterBBox.width)
	}
	if (shifted.x + shifted.width > viewport.width && clusterBBox.width > 0) {
		const available = viewport.width - shifted.x
		scaleX = Math.max(MIN_CLUSTER_SCALE, available / clusterBBox.width)
	}
	if (shifted.y < 0 && clusterBBox.height > 0) {
		const available = clusterBBox.height + shifted.y
		scaleY = Math.max(MIN_CLUSTER_SCALE, available / clusterBBox.height)
	}
	if (shifted.y + shifted.height > viewport.height && clusterBBox.height > 0) {
		const available = viewport.height - shifted.y
		scaleY = Math.max(MIN_CLUSTER_SCALE, available / clusterBBox.height)
	}

	return Math.min(scaleX, scaleY)
}

/**
 * Pass 1: Escape — translate + scale clusters clear of obstacle.
 * After translation, shrink individual windows that still overlap the obstacle.
 */
function computeClusterEscape(
	clusterEntries: [string, EntityRect][],
	obstacle: Rect,
	viewport: Viewport,
): {
	positions: Map<string, { x: number; y: number }>
	sizes: Map<string, { width: number; height: number }>
	escapeAxis: 'x' | 'y'
} {
	const sizes = new Map<string, { width: number; height: number }>()
	const rects = clusterEntries.map(([, r]) => r as Rect)
	const bbox = boundingBox(rects)
	const escapes = findEscapeVectors(bbox, obstacle, viewport)

	let positions: Map<string, { x: number; y: number }>
	let escapeAxis: 'x' | 'y'

	// Try pure translation first (scale = 1)
	const pureEscape = escapes.find((e) => escapeWouldFit(bbox, e, viewport))
	if (pureEscape) {
		positions = applyClusterTransform(clusterEntries, pureEscape, 1, viewport)
		escapeAxis = pureEscape.axis
	} else {
		// No pure escape fits — try translation + scale
		const bestEscape = escapes[0]
		const scale = computeFitScale(bbox, bestEscape, viewport)

		if (scale >= MIN_CLUSTER_SCALE) {
			positions = applyClusterTransform(clusterEntries, bestEscape, scale, viewport)
		} else {
			// Fallback: clamp everything
			positions = new Map<string, { x: number; y: number }>()
			for (const [id, rect] of clusterEntries) {
				const clamped = clampToViewport(
					{ ...rect, x: rect.x + bestEscape.dx, y: rect.y + bestEscape.dy },
					viewport,
				)
				positions.set(id, { x: clamped.x, y: clamped.y })
			}
		}
		escapeAxis = bestEscape.axis
	}

	// Per-window shrink-to-clear: after translation, check each resizable entity
	// for overlap with the obstacle and shrink on the escape axis to clear it.
	for (const [id, rect] of clusterEntries) {
		if (!rect.resizable) continue

		const pos = positions.get(id) ?? { x: rect.x, y: rect.y }
		const currentSize = sizes.get(id) ?? { width: rect.width, height: rect.height }
		const postRect: Rect = { x: pos.x, y: pos.y, ...currentSize }

		if (!rectsOverlap(postRect, obstacle)) continue

		if (escapeAxis === 'x') {
			// Escaped horizontally — shrink width to clear
			const escapeDir = pos.x < obstacle.x ? 'left' : 'right'
			let newWidth = currentSize.width
			if (escapeDir === 'left') {
				// Window is to the left: right edge must be before obstacle left edge
				newWidth = Math.max(MIN_WINDOW_WIDTH, obstacle.x - pos.x)
			} else {
				// Window is to the right: left edge must be past obstacle right edge
				const clearX = obstacle.x + obstacle.width
				newWidth = Math.max(MIN_WINDOW_WIDTH, pos.x + currentSize.width - clearX)
				// Also shift position right so the window starts at the clear point
				positions.set(id, { x: clearX, y: pos.y })
			}
			sizes.set(id, { width: newWidth, height: currentSize.height })
		} else {
			// Escaped vertically — shrink height to clear
			const escapeDir = pos.y < obstacle.y ? 'up' : 'down'
			let newHeight = currentSize.height
			if (escapeDir === 'up') {
				newHeight = Math.max(MIN_WINDOW_HEIGHT, obstacle.y - pos.y)
			} else {
				const clearY = obstacle.y + obstacle.height
				newHeight = Math.max(MIN_WINDOW_HEIGHT, pos.y + currentSize.height - clearY)
				positions.set(id, { x: pos.x, y: clearY })
			}
			sizes.set(id, { width: currentSize.width, height: newHeight })
		}
	}

	return { positions, sizes, escapeAxis }
}

/**
 * Pass 2: Readability — perpendicular-axis cluster reflow.
 * Compresses inter-entity gaps to MIN_ENTITY_GAP, then distributes surplus
 * viewport space to windows (grow on perpendicular axis).
 * Sequential rebuild guarantees no intra-cluster overlap.
 */
function optimizeClusterLayout(
	clusterEntries: [string, EntityRect][],
	positions: Map<string, { x: number; y: number }>,
	sizes: Map<string, { width: number; height: number }>,
	escapeAxis: 'x' | 'y',
	viewport: Viewport,
): void {
	if (clusterEntries.length <= 1) return
	const windows = clusterEntries.filter(([, r]) => r.resizable)
	if (windows.length === 0) return

	const perpAxis = escapeAxis === 'x' ? 'y' : 'x'
	const perpDim: 'width' | 'height' = perpAxis === 'y' ? 'height' : 'width'
	const vpDim = perpDim === 'height' ? viewport.height : viewport.width

	// Sort entities by perpendicular-axis position (preserve visual order)
	const sorted = [...clusterEntries].sort((a, b) => {
		const posA = positions.get(a[0]) ?? { x: a[1].x, y: a[1].y }
		const posB = positions.get(b[0]) ?? { x: b[1].x, y: b[1].y }
		return posA[perpAxis] - posB[perpAxis]
	})

	// Compute perpendicular-axis centroid of current layout
	const firstPos = positions.get(sorted[0][0]) ?? { x: sorted[0][1].x, y: sorted[0][1].y }
	const lastEntry = sorted[sorted.length - 1]
	const lastPos = positions.get(lastEntry[0]) ?? { x: lastEntry[1].x, y: lastEntry[1].y }
	const lastSize = sizes.get(lastEntry[0]) ?? {
		width: lastEntry[1].width,
		height: lastEntry[1].height,
	}
	const centroid = (firstPos[perpAxis] + lastPos[perpAxis] + lastSize[perpDim]) / 2

	// Compute minimum footprint: all entity sizes + compressed gaps
	let totalEntitySize = 0
	for (const [id, rect] of sorted) {
		const size = sizes.get(id) ?? { width: rect.width, height: rect.height }
		totalEntitySize += size[perpDim]
	}
	const minFootprint = totalEntitySize + (sorted.length - 1) * MIN_ENTITY_GAP

	// Compute surplus
	const available = vpDim - 2 * VIEWPORT_INSET
	const surplus = available - minFootprint
	if (surplus < 20) return // not worth disrupting layout

	// Distribute surplus to windows
	const perWindowGrowth = Math.floor(surplus / windows.length)

	// Rebuild positions sequentially, centered on cluster's original centroid
	const newFootprint = minFootprint + perWindowGrowth * windows.length
	let startPos = centroid - newFootprint / 2
	startPos = Math.max(VIEWPORT_INSET, Math.min(startPos, vpDim - VIEWPORT_INSET - newFootprint))

	let cursor = startPos
	for (const [id, rect] of sorted) {
		const pos = positions.get(id) ?? { x: rect.x, y: rect.y }
		const currentSize = sizes.get(id) ?? { width: rect.width, height: rect.height }

		// Set perpendicular-axis position, preserve escape-axis position
		if (perpAxis === 'y') {
			positions.set(id, { x: pos.x, y: cursor })
		} else {
			positions.set(id, { x: cursor, y: pos.y })
		}

		// Grow windows on perpendicular axis
		let entityPerpSize = currentSize[perpDim]
		if (rect.resizable) {
			entityPerpSize += perWindowGrowth
			if (perpDim === 'height') {
				sizes.set(id, { width: currentSize.width, height: entityPerpSize })
			} else {
				sizes.set(id, { width: entityPerpSize, height: currentSize.height })
			}
		}

		cursor += entityPerpSize + MIN_ENTITY_GAP
	}
}

/**
 * Split overlapping entities into two groups based on obstacle geometry.
 * Wide obstacle (width >= height): split left/right by X center.
 * Tall obstacle (height > width): split top/bottom by Y center.
 */
function splitOverlapping(
	overlapping: number[],
	rects: Rect[],
	obstacle: Rect,
): [number[], number[]] {
	const splitByX = obstacle.width >= obstacle.height
	const axis = splitByX ? 'x' : 'y'
	const dim = splitByX ? 'width' : 'height'
	const center = obstacle[axis] + obstacle[dim] / 2
	const groupA = overlapping.filter((i) => rects[i][axis] + rects[i][dim] / 2 < center)
	const groupB = overlapping.filter((i) => rects[i][axis] + rects[i][dim] / 2 >= center)
	return [groupA, groupB]
}

export function partAroundObstacle({
	entities,
	obstacle,
	viewport,
	padding,
}: PartInput): PartResult {
	const pad = padding ?? PARTING_PADDING
	const paddedObstacle: Rect = {
		x: obstacle.x - pad,
		y: obstacle.y - pad,
		width: obstacle.width + pad * 2,
		height: obstacle.height + pad * 2,
	}

	const entityEntries = Array.from(entities.entries())
	const rects = entityEntries.map(([, r]) => r as Rect)
	const overlapping = findZoneOverlaps(rects, paddedObstacle)

	if (overlapping.length === 0) {
		return {
			movedEntities: new Map(),
			resizedEntities: new Map(),
			savedPositions: new Map(),
			savedSizes: new Map(),
		}
	}

	const savedPositions = new Map<string, { x: number; y: number }>()
	const savedSizes = new Map<string, { width: number; height: number }>()

	for (const idx of overlapping) {
		const [id, rect] = entityEntries[idx]
		savedPositions.set(id, { x: rect.x, y: rect.y })
		savedSizes.set(id, { width: rect.width, height: rect.height })
	}

	const [groupA, groupB] = splitOverlapping(overlapping, rects, obstacle)

	const allPositions = new Map<string, { x: number; y: number }>()
	const allSizes = new Map<string, { width: number; height: number }>()

	for (const cluster of [groupA, groupB]) {
		if (cluster.length === 0) continue

		const clusterEntries = cluster.map((i) => entityEntries[i]) as [string, EntityRect][]

		// Pass 1: Escape (translate + scale + optional window shrink)
		const { positions, sizes, escapeAxis } = computeClusterEscape(
			clusterEntries,
			paddedObstacle,
			viewport,
		)

		// Pass 2: Readability (grow windows if space permits)
		optimizeClusterLayout(clusterEntries, positions, sizes, escapeAxis, viewport)

		for (const [id, pos] of positions) allPositions.set(id, pos)
		for (const [id, size] of sizes) allSizes.set(id, size)
	}

	// Final safety: obstacle clearance > viewport inset.
	// If viewport clamp would push an entity back into obstacle, keep the obstacle-clear
	// position and allow the entity to touch the viewport edge.
	for (const [id, pos] of allPositions) {
		const rect = entities.get(id)
		if (!rect) continue
		const size = allSizes.get(id) ?? { width: rect.width, height: rect.height }
		let final: Rect = { x: pos.x, y: pos.y, ...size }

		// If still overlapping paddedObstacle, nudge clear
		if (rectsOverlap(final, paddedObstacle)) {
			final = nudge(final, paddedObstacle, viewport, false)
		}

		// Try viewport clamp
		const clamped = clampToViewport(final, viewport)

		// If viewport clamp re-created obstacle overlap, keep obstacle-clear position
		// (allow viewport inset violation — obstacle clearance > viewport inset)
		if (rectsOverlap({ ...clamped, width: size.width, height: size.height }, paddedObstacle)) {
			allPositions.set(id, {
				x: Math.max(0, Math.min(final.x, viewport.width - size.width)),
				y: Math.max(0, Math.min(final.y, viewport.height - size.height)),
			})
		} else {
			allPositions.set(id, { x: clamped.x, y: clamped.y })
		}
	}

	return {
		movedEntities: allPositions,
		resizedEntities: allSizes,
		savedPositions,
		savedSizes,
	}
}

export function unpartAroundObstacle(
	savedPositions: Map<string, { x: number; y: number }>,
	savedSizes: Map<string, { width: number; height: number }>,
): {
	positions: Map<string, { x: number; y: number }>
	sizes: Map<string, { width: number; height: number }>
} {
	return {
		positions: new Map(savedPositions),
		sizes: new Map(savedSizes),
	}
}
