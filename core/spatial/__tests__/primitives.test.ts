import { describe, expect, it } from 'vitest'
import {
	boundingBox,
	clampToViewport,
	entityToRect,
	findOverlaps,
	findZoneOverlaps,
	nudge,
	rectsOverlap,
	VIEWPORT_INSET,
} from '../primitives'

const viewport = { width: 1280, height: 800 }

describe('rectsOverlap', () => {
	it('detects overlapping rects', () => {
		const a = { x: 0, y: 0, width: 100, height: 100 }
		const b = { x: 50, y: 50, width: 100, height: 100 }
		expect(rectsOverlap(a, b)).toBe(true)
	})

	it('returns false for adjacent rects (touching edges)', () => {
		const a = { x: 0, y: 0, width: 100, height: 100 }
		const right = { x: 100, y: 0, width: 100, height: 100 }
		const below = { x: 0, y: 100, width: 100, height: 100 }

		expect(rectsOverlap(a, right)).toBe(false)
		expect(rectsOverlap(a, below)).toBe(false)
	})

	it('returns false for separated rects', () => {
		const a = { x: 0, y: 0, width: 50, height: 50 }
		const b = { x: 200, y: 200, width: 50, height: 50 }
		expect(rectsOverlap(a, b)).toBe(false)
	})

	it('detects containment as overlap', () => {
		const outer = { x: 0, y: 0, width: 200, height: 200 }
		const inner = { x: 50, y: 50, width: 20, height: 20 }
		expect(rectsOverlap(outer, inner)).toBe(true)
		expect(rectsOverlap(inner, outer)).toBe(true)
	})

	it('treats zero-width rect inside another as overlapping (degenerate line)', () => {
		const a = { x: 50, y: 50, width: 0, height: 100 }
		const b = { x: 0, y: 0, width: 100, height: 100 }
		// Strict < / > means a zero-width rect at x=50 passes both checks.
		// This is standard AABB behavior — zero-size entities don't exist in practice.
		expect(rectsOverlap(a, b)).toBe(true)
	})
})

describe('findOverlaps', () => {
	it('returns empty for non-overlapping rects', () => {
		const rects = [
			{ x: 0, y: 0, width: 50, height: 50 },
			{ x: 100, y: 100, width: 50, height: 50 },
		]
		expect(findOverlaps(rects)).toEqual([])
	})

	it('returns index pairs for overlapping rects', () => {
		const rects = [
			{ x: 0, y: 0, width: 100, height: 100 },
			{ x: 50, y: 50, width: 100, height: 100 },
			{ x: 500, y: 500, width: 50, height: 50 },
		]
		expect(findOverlaps(rects)).toEqual([[0, 1]])
	})

	it('returns multiple pairs when several rects overlap', () => {
		const rects = [
			{ x: 0, y: 0, width: 200, height: 200 },
			{ x: 50, y: 50, width: 200, height: 200 },
			{ x: 100, y: 100, width: 200, height: 200 },
		]
		const pairs = findOverlaps(rects)
		expect(pairs).toContainEqual([0, 1])
		expect(pairs).toContainEqual([0, 2])
		expect(pairs).toContainEqual([1, 2])
	})
})

describe('findZoneOverlaps', () => {
	it('returns indices of rects overlapping the zone', () => {
		const rects = [
			{ x: 0, y: 0, width: 50, height: 50 },
			{ x: 400, y: 300, width: 100, height: 100 },
			{ x: 900, y: 600, width: 50, height: 50 },
		]
		const zone = { x: 350, y: 250, width: 200, height: 200 }

		expect(findZoneOverlaps(rects, zone)).toEqual([1])
	})

	it('returns empty when no rects overlap', () => {
		const rects = [{ x: 0, y: 0, width: 50, height: 50 }]
		const zone = { x: 500, y: 500, width: 100, height: 100 }

		expect(findZoneOverlaps(rects, zone)).toEqual([])
	})

	it('returns multiple indices', () => {
		const rects = [
			{ x: 10, y: 10, width: 50, height: 50 },
			{ x: 30, y: 30, width: 50, height: 50 },
		]
		const zone = { x: 0, y: 0, width: 100, height: 100 }

		expect(findZoneOverlaps(rects, zone)).toEqual([0, 1])
	})
})

describe('clampToViewport', () => {
	it('clamps rect that overflows left edge', () => {
		const rect = { x: -20, y: 100, width: 100, height: 100 }
		const clamped = clampToViewport(rect, viewport)

		expect(clamped.x).toBe(VIEWPORT_INSET)
		expect(clamped.y).toBe(100)
	})

	it('clamps rect that overflows right edge', () => {
		const rect = { x: 1250, y: 100, width: 100, height: 100 }
		const clamped = clampToViewport(rect, viewport)

		expect(clamped.x).toBe(viewport.width - 100 - VIEWPORT_INSET)
	})

	it('clamps rect that overflows top edge', () => {
		const rect = { x: 100, y: -50, width: 100, height: 100 }
		const clamped = clampToViewport(rect, viewport)

		expect(clamped.y).toBe(VIEWPORT_INSET)
	})

	it('clamps rect that overflows bottom edge', () => {
		const rect = { x: 100, y: 750, width: 100, height: 100 }
		const clamped = clampToViewport(rect, viewport)

		expect(clamped.y).toBe(viewport.height - 100 - VIEWPORT_INSET)
	})

	it('does not move a rect already inside viewport', () => {
		const rect = { x: 100, y: 100, width: 200, height: 200 }
		const clamped = clampToViewport(rect, viewport)

		expect(clamped.x).toBe(100)
		expect(clamped.y).toBe(100)
	})

	it('preserves width and height', () => {
		const rect = { x: -100, y: -100, width: 300, height: 250 }
		const clamped = clampToViewport(rect, viewport)

		expect(clamped.width).toBe(300)
		expect(clamped.height).toBe(250)
	})
})

describe('nudge', () => {
	it('returns rect unchanged when no overlap', () => {
		const rect = { x: 0, y: 0, width: 50, height: 50 }
		const obstacle = { x: 200, y: 200, width: 100, height: 100 }

		expect(nudge(rect, obstacle, viewport)).toEqual(rect)
	})

	it('nudges along axis of least overlap', () => {
		// rect overlaps obstacle more on Y than X → nudge on X
		const rect = { x: 90, y: 10, width: 50, height: 80 }
		const obstacle = { x: 100, y: 0, width: 100, height: 100 }
		const nudged = nudge(rect, obstacle, viewport)

		// Should push left (rect center-x < obstacle center-x)
		expect(nudged.x + nudged.width).toBeLessThanOrEqual(obstacle.x)
	})

	it('clamps result to viewport', () => {
		// rect near left edge, obstacle forces it further left
		const rect = { x: 5, y: 50, width: 50, height: 50 }
		const obstacle = { x: 0, y: 0, width: 100, height: 100 }
		const nudged = nudge(rect, obstacle, viewport)

		expect(nudged.x).toBeGreaterThanOrEqual(VIEWPORT_INSET)
		expect(nudged.y).toBeGreaterThanOrEqual(VIEWPORT_INSET)
	})
})

describe('boundingBox', () => {
	it('returns zero rect for empty array', () => {
		expect(boundingBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 })
	})

	it('returns the rect itself for a single rect', () => {
		const rect = { x: 10, y: 20, width: 100, height: 50 }
		expect(boundingBox([rect])).toEqual(rect)
	})

	it('computes bounding box of multiple rects', () => {
		const rects = [
			{ x: 10, y: 20, width: 100, height: 50 },
			{ x: 50, y: 10, width: 200, height: 100 },
		]
		expect(boundingBox(rects)).toEqual({ x: 10, y: 10, width: 240, height: 100 })
	})

	it('handles non-overlapping rects', () => {
		const rects = [
			{ x: 0, y: 0, width: 50, height: 50 },
			{ x: 200, y: 300, width: 100, height: 100 },
		]
		expect(boundingBox(rects)).toEqual({ x: 0, y: 0, width: 300, height: 400 })
	})
})

describe('entityToRect', () => {
	it('converts entity-like object to Rect', () => {
		const entity = {
			position: { x: 10, y: 20 },
			size: { width: 300, height: 400 },
		}
		expect(entityToRect(entity)).toEqual({ x: 10, y: 20, width: 300, height: 400 })
	})
})
