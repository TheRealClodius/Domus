/**
 * SPIKE CODE — throwaway, not production
 *
 * Recipe: Generation Tiling
 * When the agent creates N entities at once, tile them into a grid
 * that avoids existing entities and stays within the viewport.
 */

import type { Rect, Viewport } from './primitives'
import { VIEWPORT_INSET, clampToViewport, rectsOverlap } from './primitives'

const GAP = 24

interface TileInput {
	/** Sizes of the new entities to place */
	newSizes: { width: number; height: number }[]
	/** Rects of existing entities already on canvas */
	existing: Rect[]
	/** Canvas viewport */
	viewport: Viewport
}

interface TileResult {
	positions: { x: number; y: number }[]
}

/**
 * Tile N new entities into a centered grid, avoiding existing entities.
 *
 * Strategy:
 * 1. Compute a grid layout (max 5 columns) centered in the viewport
 * 2. For each cell, check if it overlaps any existing entity
 * 3. If it does, nudge it downward until clear
 */
export function tileNewEntities({ newSizes, existing, viewport }: TileInput): TileResult {
	if (newSizes.length === 0) return { positions: [] }

	// Use the first entity's size as the cell size (uniform grid)
	const cellW = newSizes[0].width
	const cellH = newSizes[0].height

	const cols = Math.min(newSizes.length, 5)
	const rows = Math.ceil(newSizes.length / cols)

	const gridW = cols * cellW + (cols - 1) * GAP
	const gridH = rows * cellH + (rows - 1) * GAP

	// Center the grid in the viewport
	const startX = Math.max(VIEWPORT_INSET, (viewport.width - gridW) / 2)
	const startY = Math.max(VIEWPORT_INSET, (viewport.height - gridH) / 2)

	const positions: { x: number; y: number }[] = []

	for (let i = 0; i < newSizes.length; i++) {
		const col = i % cols
		const row = Math.floor(i / cols)

		let candidate: Rect = {
			x: startX + col * (cellW + GAP),
			y: startY + row * (cellH + GAP),
			width: newSizes[i].width,
			height: newSizes[i].height,
		}

		candidate = clampToViewport(candidate, viewport)

		// Check against existing entities — if overlapping, push down
		let attempts = 0
		while (attempts < 10 && existing.some((e) => rectsOverlap(candidate, e))) {
			candidate = { ...candidate, y: candidate.y + cellH + GAP }
			candidate = clampToViewport(candidate, viewport)
			attempts++
		}

		positions.push({ x: candidate.x, y: candidate.y })
	}

	return { positions }
}
