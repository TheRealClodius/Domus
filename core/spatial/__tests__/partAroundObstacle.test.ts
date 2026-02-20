import { describe, expect, it } from 'vitest'
import { partAroundObstacle, unpartAroundObstacle } from '../partAroundObstacle'
import { rectsOverlap, VIEWPORT_INSET } from '../primitives'

const viewport = { width: 1280, height: 800 }

// Chat panel: 400px wide, centered horizontally, bottom half of viewport
const chatRect = { x: 440, y: 300, width: 400, height: 400 }

/** Padded obstacle rect (matches PARTING_PADDING = VIEWPORT_INSET) */
const paddedObstacle = {
	x: chatRect.x - VIEWPORT_INSET,
	y: chatRect.y - VIEWPORT_INSET,
	width: chatRect.width + VIEWPORT_INSET * 2,
	height: chatRect.height + VIEWPORT_INSET * 2,
}

type EntityRect = {
	x: number
	y: number
	width: number
	height: number
	resizable: boolean
}

function card(x: number, y: number, w = 232, h = 300): EntityRect {
	return { x, y, width: w, height: h, resizable: false }
}

function window_(x: number, y: number, w = 400, h = 500): EntityRect {
	return { x, y, width: w, height: h, resizable: true }
}

function resultRect(
	id: string,
	result: ReturnType<typeof partAroundObstacle>,
	entities: Map<string, EntityRect>,
) {
	const pos = result.movedEntities.get(id)
	const size = result.resizedEntities.get(id)
	const original = entities.get(id)
	if (!original) throw new Error(`Entity ${id} not found`)
	return {
		x: pos?.x ?? original.x,
		y: pos?.y ?? original.y,
		width: size?.width ?? original.width,
		height: size?.height ?? original.height,
	}
}

describe('partAroundObstacle', () => {
	it('returns empty maps when no entities overlap obstacle', () => {
		const entities = new Map([
			['a', card(0, 0)],
			['b', card(1000, 0)],
		])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		expect(result.movedEntities.size).toBe(0)
		expect(result.resizedEntities.size).toBe(0)
		expect(result.savedPositions.size).toBe(0)
		expect(result.savedSizes.size).toBe(0)
	})

	it('moves a single card clear of the obstacle', () => {
		const entities = new Map([['a', card(500, 400)]])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		expect(result.movedEntities.has('a')).toBe(true)
		const rect = resultRect('a', result, entities)
		expect(rectsOverlap(rect, paddedObstacle)).toBe(false)
	})

	it('saves original positions for restoration', () => {
		const entities = new Map([['a', card(500, 400)]])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		expect(result.savedPositions.get('a')).toEqual({ x: 500, y: 400 })
		expect(result.savedSizes.get('a')).toEqual({ width: 232, height: 300 })
	})

	it('splits entities into left/right clusters for wide obstacle', () => {
		// One card left of center, one right
		const entities = new Map([
			['left', card(450, 400)], // center-x = 450 + 116 = 566 < 640
			['right', card(660, 400)], // center-x = 660 + 116 = 776 >= 640
		])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		const leftPos = result.movedEntities.get('left')
		const rightPos = result.movedEntities.get('right')
		expect(leftPos).toBeDefined()
		expect(rightPos).toBeDefined()

		// Left cluster should move left, right cluster should move right
		expect(leftPos?.x).toBeLessThan(450)
		expect(rightPos?.x).toBeGreaterThan(660)
	})

	it('preserves group topology — two fanned cards stay fanned', () => {
		// Two cards in a slight fan (offset by 30px each axis)
		const entities = new Map([
			['a', card(470, 380)],
			['b', card(500, 410)],
		])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		const posA = result.movedEntities.get('a')
		const posB = result.movedEntities.get('b')
		expect(posA).toBeDefined()
		expect(posB).toBeDefined()

		// Relative offset should be preserved (or scaled, not collapsed)
		const dx = (posB?.x ?? 0) - (posA?.x ?? 0)
		const dy = (posB?.y ?? 0) - (posA?.y ?? 0)

		// Same sign as original offsets (30, 30)
		expect(dx).toBeGreaterThan(0)
		expect(dy).toBeGreaterThan(0)
	})

	it('non-resizable entity ends up clear of obstacle', () => {
		// Card placed right in the center of the obstacle
		const entities = new Map([['card', card(524, 450)]])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		const rect = resultRect('card', result, entities)
		expect(rectsOverlap(rect, paddedObstacle)).toBe(false)
	})

	it('non-resizable entity near viewport edge still clears obstacle', () => {
		// Card near left edge AND overlapping obstacle — escape left is tight
		const entities = new Map([['card', card(430, 400)]])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		const rect = resultRect('card', result, entities)
		expect(rectsOverlap(rect, paddedObstacle)).toBe(false)
	})

	it('single window cluster is not stretched to fill viewport', () => {
		const entities = new Map([['win', window_(500, 350, 400, 400)]])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		const rect = resultRect('win', result, entities)

		// Should not be wider than original (400px) — readability skips single-entity clusters
		expect(rect.width).toBeLessThanOrEqual(400)
		// Should clear obstacle
		expect(rectsOverlap(rect, paddedObstacle)).toBe(false)
	})

	it('resizable window can be shrunk to clear obstacle (shrink-to-clear)', () => {
		// Wide window that heavily overlaps obstacle — may need shrink
		const entities = new Map([['win', window_(400, 300, 600, 400)]])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		const rect = resultRect('win', result, entities)
		expect(rectsOverlap(rect, paddedObstacle)).toBe(false)
		// Width may have been reduced
		if (result.resizedEntities.has('win')) {
			expect(result.resizedEntities.get('win')?.width).toBeGreaterThanOrEqual(300) // MIN_WINDOW_WIDTH
		}
	})

	it('respects minimum window dimensions during shrink', () => {
		// Extremely tight scenario — window can barely escape
		const tightViewport = { width: 900, height: 700 }
		const tightObstacle = { x: 250, y: 150, width: 400, height: 400 }
		const entities = new Map([['win', window_(300, 200, 500, 450)]])
		const result = partAroundObstacle({
			entities,
			obstacle: tightObstacle,
			viewport: tightViewport,
		})

		if (result.resizedEntities.has('win')) {
			const size = result.resizedEntities.get('win')
			expect(size?.width).toBeGreaterThanOrEqual(300)
			expect(size?.height).toBeGreaterThanOrEqual(200)
		}
	})

	it('entities stay within viewport after parting', () => {
		const entities = new Map<string, EntityRect>([
			['a', card(460, 350)],
			['b', card(600, 400)],
			['c', window_(480, 300, 350, 400)],
		])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		for (const [id] of entities) {
			const rect = resultRect(id, result, entities)
			// Allow small inset violation (obstacle clearance > viewport inset)
			// but entity must be fully on-screen
			expect(rect.x).toBeGreaterThanOrEqual(0)
			expect(rect.y).toBeGreaterThanOrEqual(0)
			expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width)
			expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height)
		}
	})

	it('readability grow is perpendicular to escape axis', () => {
		// Two windows side by side overlapping obstacle — escape should be horizontal,
		// readability grow should be on the vertical (height) axis
		const entities = new Map<string, EntityRect>([
			['a', window_(450, 350, 350, 300)],
			['b', window_(450, 400, 350, 300)],
		])
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		// Both should be in the same cluster (both left of obstacle center)
		// If readability applied, heights may have grown but widths should not
		for (const [id] of entities) {
			const rect = resultRect(id, result, entities)
			expect(rect.width).toBeLessThanOrEqual(350) // should not grow width
		}
	})

	it('handles many entities without error', () => {
		const entities = new Map<string, EntityRect>()
		for (let i = 0; i < 20; i++) {
			const x = 400 + (i % 5) * 50
			const y = 300 + Math.floor(i / 5) * 80
			entities.set(`e${i}`, card(x, y))
		}
		const result = partAroundObstacle({ entities, obstacle: chatRect, viewport })

		// All moved entities should clear the obstacle
		for (const [id] of result.movedEntities) {
			const rect = resultRect(id, result, entities)
			expect(rectsOverlap(rect, paddedObstacle)).toBe(false)
		}
	})

	it('splits top/bottom for tall obstacle (Y-split)', () => {
		// Tall sidebar-like obstacle: 250px wide, 800px tall
		const tallObstacle = { x: 0, y: 0, width: 250, height: 800 }
		// One entity above center, one below
		const entities = new Map([
			['top', card(50, 100)], // center-y = 100 + 150 = 250 < 400
			['bottom', card(50, 500)], // center-y = 500 + 150 = 650 >= 400
		])
		const result = partAroundObstacle({ entities, obstacle: tallObstacle, viewport })

		const topPos = result.movedEntities.get('top')
		const bottomPos = result.movedEntities.get('bottom')
		expect(topPos).toBeDefined()
		expect(bottomPos).toBeDefined()

		// Top entity should move up (or at least be above obstacle center),
		// bottom entity should move down (or at least be below obstacle center)
		expect(topPos!.y).toBeLessThan(bottomPos!.y)
	})

	it('splits left/right for square obstacle (X-split default)', () => {
		// Square obstacle: width >= height triggers X-split
		const squareObstacle = { x: 440, y: 200, width: 400, height: 400 }
		const entities = new Map([
			['left', card(450, 300)], // center-x = 450 + 116 = 566 < 640
			['right', card(660, 300)], // center-x = 660 + 116 = 776 >= 640
		])
		const result = partAroundObstacle({ entities, obstacle: squareObstacle, viewport })

		const leftPos = result.movedEntities.get('left')
		const rightPos = result.movedEntities.get('right')
		expect(leftPos).toBeDefined()
		expect(rightPos).toBeDefined()

		// Left cluster should move left, right cluster should move right
		expect(leftPos!.x).toBeLessThan(rightPos!.x)
	})

	it('uses custom padding when provided', () => {
		const customPadding = 32
		const entities = new Map([['a', card(500, 400)]])
		const result = partAroundObstacle({
			entities,
			obstacle: chatRect,
			viewport,
			padding: customPadding,
		})

		expect(result.movedEntities.has('a')).toBe(true)
		const rect = resultRect('a', result, entities)

		// Entity should clear the obstacle with custom padding
		const customPaddedObstacle = {
			x: chatRect.x - customPadding,
			y: chatRect.y - customPadding,
			width: chatRect.width + customPadding * 2,
			height: chatRect.height + customPadding * 2,
		}
		expect(rectsOverlap(rect, customPaddedObstacle)).toBe(false)
	})
})

describe('unpartAroundObstacle', () => {
	it('returns saved positions and sizes unchanged', () => {
		const savedPositions = new Map([
			['a', { x: 500, y: 400 }],
			['b', { x: 600, y: 350 }],
		])
		const savedSizes = new Map([
			['a', { width: 232, height: 300 }],
			['b', { width: 400, height: 500 }],
		])
		const result = unpartAroundObstacle(savedPositions, savedSizes)

		expect(result.positions).toEqual(savedPositions)
		expect(result.sizes).toEqual(savedSizes)
	})

	it('returns independent copies (mutation-safe)', () => {
		const savedPositions = new Map([['a', { x: 100, y: 200 }]])
		const savedSizes = new Map([['a', { width: 300, height: 400 }]])
		const result = unpartAroundObstacle(savedPositions, savedSizes)

		// Mutating the result should not affect the originals
		result.positions.set('a', { x: 999, y: 999 })
		expect(savedPositions.get('a')).toEqual({ x: 100, y: 200 })
	})

	it('round-trips with partAroundObstacle — restores original layout', () => {
		const entities = new Map<string, EntityRect>([
			['a', card(500, 400)],
			['b', window_(600, 350, 400, 400)],
		])
		const partResult = partAroundObstacle({ entities, obstacle: chatRect, viewport })
		const restored = unpartAroundObstacle(partResult.savedPositions, partResult.savedSizes)

		for (const [id, original] of entities) {
			expect(restored.positions.get(id)).toEqual({ x: original.x, y: original.y })
			expect(restored.sizes.get(id)).toEqual({ width: original.width, height: original.height })
		}
	})
})
