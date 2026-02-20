# Window Escape Resize Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix parting so windows shrink to fully clear the chat zone, then grow on the perpendicular axis to recover visual area.

**Architecture:** Replace the heuristic `scale < 0.85` shrink in `computeClusterEscape` with a precise per-window overlap check + shrink-to-clear. Replace the readability grow (currently same-axis) with perpendicular-axis growth. Both changes are in `core/spatial/partForChat.ts`.

**Tech Stack:** TypeScript, pure functions (no React/DOM). Spike code — no production lint.

**Design doc:** `docs/plans/2026-02-18-window-escape-resize-design.md`

---

### Task 1: Add `rectsOverlap` import

**Files:**
- Modify: `core/spatial/partForChat.ts:11`

**Step 1: Add import**

Change line 11 from:
```typescript
import { VIEWPORT_INSET, clampToViewport, findZoneOverlaps } from './primitives'
```
to:
```typescript
import { VIEWPORT_INSET, clampToViewport, findZoneOverlaps, rectsOverlap } from './primitives'
```

**Step 2: Verify** — `npx tsc --noEmit -p tsconfig.json` (no new errors)

---

### Task 2: Replace heuristic shrink with per-window shrink-to-clear

**Files:**
- Modify: `core/spatial/partForChat.ts:208-271` (the `computeClusterEscape` function)

**Step 1: Replace the `scale < 0.85` block and add shrink-to-clear after every escape path**

Replace the entire `computeClusterEscape` function (lines 208–271) with:

```typescript
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
```

**Step 2: Verify** — `npx tsc --noEmit -p tsconfig.json` (no new errors)

---

### Task 3: Replace same-axis grow with perpendicular-axis grow

**Files:**
- Modify: `core/spatial/partForChat.ts:273-313` (the `computeReadabilityGrow` function)

**Step 1: Replace the entire `computeReadabilityGrow` function**

```typescript
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
```

**Step 2: Verify** — `npx tsc --noEmit -p tsconfig.json` (no new errors)

---

### Task 4: Browser smoke test

**Step 1:** Open `localhost:3001` in the spike-spatial worktree

**Step 2:** Tile 6 cards (debug panel button)

**Step 3:** Open agent chat, click "Part for chat"

**Verify:**
- No entity overlaps the chat panel
- Windows that were wider than the escape corridor are now narrower but taller
- Cards maintain cluster topology (relative positions preserved)
- All entities respect the 16px viewport inset on all 4 edges

**Step 4:** Click "Unpart (restore)" — all entities return to original position and size

---

### Task 5: Update FINDINGS.md and commit

**Files:**
- Modify: `spikes/2026-02-17-collision-detection/FINDINGS.md`

**Step 1:** Add to Phase 4 section a note about the shrink-to-clear fix:
- Per-window overlap check replaces the `scale < 0.85` heuristic
- Readability grow now perpendicular to escape axis
- Windows become taller+narrower (or wider+shorter) to recover visual area

**Step 2:** Commit all changes

```bash
git add core/spatial/partForChat.ts docs/plans/ spikes/
git commit -m "fix: per-window shrink-to-clear + perpendicular readability grow"
```
