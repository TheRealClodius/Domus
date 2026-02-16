# Card Hover Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two hover action buttons (Add to Context, Maximize) to CanvasCard, visible on hover with CSS transitions.

**Architecture:** Pure CSS approach using Tailwind `group`/`group-hover` for opacity toggle. Buttons are always in the DOM but hidden. No state management needed — all visibility is CSS-driven. Click handlers are TODO stubs since downstream features (bottom sheet, context pinning) don't exist yet.

**Tech Stack:** React, Tailwind v4, lucide-react icons, existing Button component (`core/ui/button.tsx`)

**Design doc:** `docs/plans/2026-02-16-card-hover-actions-design.md`

---

### Task 1: Write failing tests for hover action buttons

**Files:**
- Modify: `core/entity/__tests__/CanvasCard.test.tsx`

**Step 1: Add tests for the two action buttons**

Add these tests to the existing `describe('CanvasCard')` block:

```tsx
it('renders add-to-context and maximize buttons', () => {
	const entity = makeEntity({ summary: 'Test card' })
	render(<CanvasCard entity={entity} />)
	expect(screen.getByRole('button', { name: 'Add to context' })).toBeDefined()
	expect(screen.getByRole('button', { name: 'Maximize' })).toBeDefined()
})

it('renders add-to-context before maximize (left to right)', () => {
	const entity = makeEntity({ summary: 'Test card' })
	render(<CanvasCard entity={entity} />)
	const buttons = screen.getAllByRole('button')
	const addIdx = buttons.findIndex(
		(b) => b.getAttribute('aria-label') === 'Add to context',
	)
	const maxIdx = buttons.findIndex(
		(b) => b.getAttribute('aria-label') === 'Maximize',
	)
	expect(addIdx).toBeLessThan(maxIdx)
})

it('action buttons container is hidden by default (opacity-0)', () => {
	const entity = makeEntity({ summary: 'Test card' })
	render(<CanvasCard entity={entity} />)
	const actions = screen.getByTestId('card-actions')
	expect(actions.className).toContain('opacity-0')
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run core/entity/__tests__/CanvasCard.test.tsx`
Expected: 3 new tests FAIL — buttons don't exist yet.

---

### Task 2: Implement card hover action buttons

**Files:**
- Modify: `core/entity/CanvasCard.tsx`

**Step 1: Add imports**

At the top of `CanvasCard.tsx`, add:

```tsx
import { ListPlus, Maximize2 } from 'lucide-react'
import { Button } from '@/core/ui/button'
```

**Step 2: Add `group` class to the root div**

The root `<div>` needs the `group` class for Tailwind's `group-hover` to work. Add it to the existing className string.

**Step 3: Add the action buttons container**

Inside the root div, before the content area comment, add:

```tsx
{/* Hover action buttons */}
<div
	data-testid="card-actions"
	className="absolute top-2 right-2 flex gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150"
>
	<Button
		variant="ghost"
		size="icon-xs"
		className="bg-surface/80 hover:bg-surface"
		aria-label="Add to context"
		onClick={(e) => {
			e.stopPropagation()
			// TODO: wire to agent context pinning
		}}
		onPointerDown={(e) => e.stopPropagation()}
	>
		<ListPlus />
	</Button>
	<Button
		variant="ghost"
		size="icon-xs"
		className="bg-surface/80 hover:bg-surface"
		aria-label="Maximize"
		onClick={(e) => {
			e.stopPropagation()
			// TODO: wire to bottom sheet expand
		}}
		onPointerDown={(e) => e.stopPropagation()}
	>
		<Maximize2 />
	</Button>
</div>
```

**Step 4: Add `relative` to the root div's className**

The root div needs `relative` for the `absolute` positioned actions container. Add it to the existing className.

**Step 5: Run tests to verify they pass**

Run: `npx vitest run core/entity/__tests__/CanvasCard.test.tsx`
Expected: All tests PASS (existing + 3 new).

**Step 6: Commit**

```bash
git add core/entity/CanvasCard.tsx core/entity/__tests__/CanvasCard.test.tsx
git commit -m "feat: add hover action buttons to CanvasCard (add to context, maximize)"
```

---

### Task 3: Run full test suite and lint

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 2: Run lint**

Run: `npx biome check core/entity/CanvasCard.tsx core/entity/__tests__/CanvasCard.test.tsx`
Expected: No errors.

**Step 3: Fix any issues, commit if needed**

---
