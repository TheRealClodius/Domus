/**
 * SPIKE CODE — throwaway, not production
 *
 * Shared spatial primitives: AABB overlap, viewport clamping, nudge.
 * Every recipe composes these.
 */

export interface Rect {
	x: number
	y: number
	width: number
	height: number
}

export interface Viewport {
	width: number
	height: number
}

/** AABB overlap test — true if rects share any interior area */
export function rectsOverlap(a: Rect, b: Rect): boolean {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/** Return all pairs of overlapping rects (by index) */
export function findOverlaps(rects: Rect[]): [number, number][] {
	const pairs: [number, number][] = []
	for (let i = 0; i < rects.length; i++) {
		for (let j = i + 1; j < rects.length; j++) {
			if (rectsOverlap(rects[i], rects[j])) {
				pairs.push([i, j])
			}
		}
	}
	return pairs
}

/** Which rects from `entities` overlap `zone`? Returns indices. */
export function findZoneOverlaps(entities: Rect[], zone: Rect): number[] {
	return entities.map((r, i) => (rectsOverlap(r, zone) ? i : -1)).filter((i) => i !== -1)
}

/** Breathing room between entities and the viewport edge */
export const VIEWPORT_INSET = 16

/** Clamp a rect to stay fully inside the viewport (with inset) */
export function clampToViewport(rect: Rect, viewport: Viewport): Rect {
	return {
		...rect,
		x: Math.max(VIEWPORT_INSET, Math.min(rect.x, viewport.width - rect.width - VIEWPORT_INSET)),
		y: Math.max(VIEWPORT_INSET, Math.min(rect.y, viewport.height - rect.height - VIEWPORT_INSET)),
	}
}

/** Push `rect` away from `obstacle` along the axis of least overlap */
export function nudge(rect: Rect, obstacle: Rect, viewport: Viewport): Rect {
	if (!rectsOverlap(rect, obstacle)) return rect

	const overlapX = Math.min(rect.x + rect.width - obstacle.x, obstacle.x + obstacle.width - rect.x)
	const overlapY = Math.min(
		rect.y + rect.height - obstacle.y,
		obstacle.y + obstacle.height - rect.y,
	)

	let nudged: Rect

	if (overlapX < overlapY) {
		const pushLeft = rect.x + rect.width / 2 < obstacle.x + obstacle.width / 2
		nudged = {
			...rect,
			x: pushLeft ? obstacle.x - rect.width : obstacle.x + obstacle.width,
		}
	} else {
		const pushUp = rect.y + rect.height / 2 < obstacle.y + obstacle.height / 2
		nudged = {
			...rect,
			y: pushUp ? obstacle.y - rect.height : obstacle.y + obstacle.height,
		}
	}

	return clampToViewport(nudged, viewport)
}

/** Convert an entity-like object to a Rect */
export function entityToRect(entity: {
	position: { x: number; y: number }
	size: { width: number; height: number }
}): Rect {
	return {
		x: entity.position.x,
		y: entity.position.y,
		width: entity.size.width,
		height: entity.size.height,
	}
}
