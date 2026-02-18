/**
 * SPIKE CODE — throwaway, not production
 *
 * Recipe: Chat-Aware Parting (Reversible)
 * Two-pass algorithm:
 *   Pass 1 — Escape: translate clusters clear + scale to fit + shrink windows if needed
 *   Pass 2 — Readability: grow windows into available space
 */

import type { Rect, Viewport } from './primitives'
import { VIEWPORT_INSET, clampToViewport, findZoneOverlaps, rectsOverlap } from './primitives'

const PARTING_PADDING = 16
const MIN_WINDOW_WIDTH = 300
const MIN_WINDOW_HEIGHT = 200
const MIN_CLUSTER_SCALE = 0.5
const GROW_THRESHOLD = 80

interface EntityRect extends Rect {
	resizable: boolean
}

interface PartInput {
	entities: Map<string, EntityRect>
	chatRect: Rect
	viewport: Viewport
}

interface PartResult {
	movedEntities: Map<string, { x: number; y: number }>
	resizedEntities: Map<string, { width: number; height: number }>
	savedPositions: Map<string, { x: number; y: number }>
	savedSizes: Map<string, { width: number; height: number }>
}

function boundingBox(rects: Rect[]): Rect {
	if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const r of rects) {
		minX = Math.min(minX, r.x)
		minY = Math.min(minY, r.y)
		maxX = Math.max(maxX, r.x + r.width)
		maxY = Math.max(maxY, r.y + r.height)
	}
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

interface EscapeVector {
	dx: number
	dy: number
	axis: 'x' | 'y'
	dist: number
}

function findEscapeVectors(
	clusterBBox: Rect,
	obstacle: Rect,
	viewport: Viewport,
): EscapeVector[] {
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

function escapeWouldFit(clusterBBox: Rect, escape: EscapeVector, viewport: Viewport): boolean {
	const shifted = {
		x: clusterBBox.x + escape.dx,
		y: clusterBBox.y + escape.dy,
		width: clusterBBox.width,
		height: clusterBBox.height,
	}
	// Use full viewport for escape planning — inset is enforced by
	// applyClusterTransform post-clamp and clampToViewport at execution time
	return shifted.x >= 0
		&& shifted.y >= 0
		&& shifted.x + shifted.width <= viewport.width
		&& shifted.y + shifted.height <= viewport.height
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
	escape: EscapeVector,
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

		const newCenterX = center.cx + offsetX + escape.dx
		const newCenterY = center.cy + offsetY + escape.dy

		positions.set(id, {
			x: newCenterX - r.width / 2,
			y: newCenterY - r.height / 2,
		})
	}

	// Post-transform: clamp the whole cluster into viewport as a group
	// (shift all entities by the same offset so relative positions are preserved)
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const [id, pos] of positions) {
		const r = entries.find(([eid]) => eid === id)?.[1]
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
function computeFitScale(
	clusterBBox: Rect,
	escape: EscapeVector,
	viewport: Viewport,
): number {
	const shifted = {
		x: clusterBBox.x + escape.dx,
		y: clusterBBox.y + escape.dy,
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
 * Pass 1: Escape — translate + scale clusters clear of chat zone.
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
			console.log(`[spatial] Cluster scale: ${scale.toFixed(2)} (axis: ${bestEscape.axis})`)
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
 * Pass 2: Readability — grow windows on the PERPENDICULAR axis to recover area.
 * If escape was horizontal, grow height. If vertical, grow width.
 */
function computeReadabilityGrow(
	clusterEntries: [string, EntityRect][],
	positions: Map<string, { x: number; y: number }>,
	sizes: Map<string, { width: number; height: number }>,
	escapeAxis: 'x' | 'y',
	viewport: Viewport,
): void {
	const windows = clusterEntries.filter(([, r]) => r.resizable)
	if (windows.length === 0) return

	// Perpendicular axis: escape x → grow height, escape y → grow width
	const growAxis = escapeAxis === 'x' ? 'y' : 'x'

	for (const [id, rect] of windows) {
		const pos = positions.get(id) ?? { x: rect.x, y: rect.y }
		const currentSize = sizes.get(id) ?? { width: rect.width, height: rect.height }

		if (growAxis === 'y') {
			// Grow height — measure spare below and above (with inset)
			const spareBelow = viewport.height - VIEWPORT_INSET - (pos.y + currentSize.height)
			const spareAbove = pos.y - VIEWPORT_INSET

			if (spareBelow < GROW_THRESHOLD && spareAbove < GROW_THRESHOLD) continue

			// Prefer growing downward for visual stability
			const growAmount = Math.floor(Math.max(spareBelow, spareAbove) * 0.5)
			if (growAmount < 20) continue

			const newHeight = Math.min(
				currentSize.height + growAmount,
				viewport.height - 2 * VIEWPORT_INSET,
			)

			// If growing upward is better, shift position up
			if (spareAbove > spareBelow) {
				const delta = newHeight - currentSize.height
				positions.set(id, { x: pos.x, y: pos.y - delta })
			}

			sizes.set(id, { width: currentSize.width, height: newHeight })
		} else {
			// Grow width — measure spare left and right (with inset)
			const spareRight = viewport.width - VIEWPORT_INSET - (pos.x + currentSize.width)
			const spareLeft = pos.x - VIEWPORT_INSET

			if (spareRight < GROW_THRESHOLD && spareLeft < GROW_THRESHOLD) continue

			const growAmount = Math.floor(Math.max(spareRight, spareLeft) * 0.5)
			if (growAmount < 20) continue

			const newWidth = Math.min(
				currentSize.width + growAmount,
				viewport.width - 2 * VIEWPORT_INSET,
			)

			if (spareLeft > spareRight) {
				const delta = newWidth - currentSize.width
				positions.set(id, { x: pos.x - delta, y: pos.y })
			}

			sizes.set(id, { width: newWidth, height: currentSize.height })
		}
	}
}

export function partForChat({ entities, chatRect, viewport }: PartInput): PartResult {
	const paddedChat: Rect = {
		x: chatRect.x - PARTING_PADDING,
		y: chatRect.y - PARTING_PADDING,
		width: chatRect.width + PARTING_PADDING * 2,
		height: chatRect.height + PARTING_PADDING * 2,
	}

	const entityEntries = Array.from(entities.entries())
	const rects = entityEntries.map(([, r]) => r as Rect)
	const overlapping = findZoneOverlaps(rects, paddedChat)

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

	const chatCenterX = chatRect.x + chatRect.width / 2
	const leftIndices = overlapping.filter((i) => rects[i].x + rects[i].width / 2 < chatCenterX)
	const rightIndices = overlapping.filter((i) => rects[i].x + rects[i].width / 2 >= chatCenterX)

	const allPositions = new Map<string, { x: number; y: number }>()
	const allSizes = new Map<string, { width: number; height: number }>()

	for (const cluster of [leftIndices, rightIndices]) {
		if (cluster.length === 0) continue

		const clusterEntries = cluster.map((i) => entityEntries[i]) as [string, EntityRect][]

		// Pass 1: Escape (translate + scale + optional window shrink)
		const { positions, sizes, escapeAxis } = computeClusterEscape(clusterEntries, paddedChat, viewport)

		// Pass 2: Readability (grow windows if space permits)
		computeReadabilityGrow(clusterEntries, positions, sizes, escapeAxis, viewport)

		for (const [id, pos] of positions) allPositions.set(id, pos)
		for (const [id, size] of sizes) allSizes.set(id, size)
	}

	// Final safety clamp: ensure every entity respects viewport inset on all 4 edges.
	// The group post-clamp uses if/else-if per axis, so if a cluster overflows both
	// top+bottom (or left+right), only one side gets fixed. This per-entity clamp
	// catches the other side. The 16px adjustment is small enough that cluster
	// topology is negligibly affected.
	for (const [id, pos] of allPositions) {
		const rect = entities.get(id)
		if (!rect) continue
		const size = allSizes.get(id) ?? { width: rect.width, height: rect.height }
		const clamped = clampToViewport({ x: pos.x, y: pos.y, ...size }, viewport)
		allPositions.set(id, { x: clamped.x, y: clamped.y })
	}

	return {
		movedEntities: allPositions,
		resizedEntities: allSizes,
		savedPositions,
		savedSizes,
	}
}

export function unpartForChat(
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
