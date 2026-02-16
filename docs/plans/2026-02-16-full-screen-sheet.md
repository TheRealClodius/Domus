# Full-Screen Sheet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable full-screen bottom sheet container with Tiptap-based rich editor, wired to the card maximize button as the first use case.

**Architecture:** Layered composition — the sheet is a pure container (animation, portal, header, dismiss). Content components (editor, login, image viewer) are separate and drop into the sheet body. State lives in a dedicated Zustand store (`sheetStore`). The canvas scales down and dims when the sheet is open via a `CanvasShell` wrapper that subscribes to sheet state.

**Tech Stack:** React 19, Zustand, motion/react (spring animations), Tiptap (rich editor), mermaid (diagram rendering)

**Phases:**
- **Phase 1 (Tasks 1–8):** Sheet container + wiring — the sheet opens, animates, dismisses, canvas scales.
- **Phase 2 (Tasks 9–13):** Rich editor — Tiptap integration, Mermaid blocks, entity content load/save.
- **Phase 3 (Tasks 14–16):** Agent streaming — agent cursor, token insertion, soft simultaneous editing.

---

## Phase 1: Sheet Container

### Task 1: Sheet Store

**Files:**
- Create: `core/sheetStore.ts`
- Create: `core/__tests__/sheetStore.test.ts`

**Context:** Follow the same Zustand pattern as `core/entityStore.ts`. The sheet store manages which sheet is open and what content it shows. Only one sheet at a time.

**Step 1: Write the failing test**

```ts
// core/__tests__/sheetStore.test.ts
import { afterEach, describe, expect, it } from 'vitest'
import { useSheetStore } from '@/core/sheetStore'

describe('sheetStore', () => {
	afterEach(() => {
		useSheetStore.getState().close()
	})

	it('starts closed', () => {
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(false)
		expect(state.entityId).toBeNull()
		expect(state.contentType).toBeNull()
	})

	it('open() sets isOpen, entityId, and contentType', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(true)
		expect(state.entityId).toBe('entity-1')
		expect(state.contentType).toBe('entity')
	})

	it('open() with null entityId works for login', () => {
		useSheetStore.getState().open(null, 'login')
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(true)
		expect(state.entityId).toBeNull()
		expect(state.contentType).toBe('login')
	})

	it('close() resets to initial state', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		useSheetStore.getState().close()
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(false)
		expect(state.entityId).toBeNull()
		expect(state.contentType).toBeNull()
	})

	it('open() replaces existing sheet', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		useSheetStore.getState().open('entity-2', 'image')
		const state = useSheetStore.getState()
		expect(state.entityId).toBe('entity-2')
		expect(state.contentType).toBe('image')
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/__tests__/sheetStore.test.ts`
Expected: FAIL — module `@/core/sheetStore` not found

**Step 3: Write minimal implementation**

```ts
// core/sheetStore.ts
import { create } from 'zustand'

export type SheetContentType = 'entity' | 'login' | 'image'

interface SheetState {
	isOpen: boolean
	entityId: string | null
	contentType: SheetContentType | null
	open: (entityId: string | null, contentType: SheetContentType) => void
	close: () => void
}

export const useSheetStore = create<SheetState>((set) => ({
	isOpen: false,
	entityId: null,
	contentType: null,

	open: (entityId, contentType) => {
		set({ isOpen: true, entityId, contentType })
	},

	close: () => {
		set({ isOpen: false, entityId: null, contentType: null })
	},
}))
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/__tests__/sheetStore.test.ts`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add core/sheetStore.ts core/__tests__/sheetStore.test.ts
git commit -m "feat: add sheetStore for full-screen sheet state"
```

---

### Task 2: SheetHeader

**Files:**
- Create: `core/sheet/SheetHeader.tsx`
- Create: `core/sheet/__tests__/SheetHeader.test.tsx`

**Context:** The header renders a close button (left, using `WindowControl` from `core/entity/WindowControl.tsx`) and an actions slot (right). Height is `h-12`, padding `px-5`. Border bottom separates it from body. The `WindowControl` component accepts an `onClick` prop and renders a red close dot.

**Step 1: Write the failing test**

```tsx
// core/sheet/__tests__/SheetHeader.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SheetHeader from '@/core/sheet/SheetHeader'

describe('SheetHeader', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders close button', () => {
		render(<SheetHeader onClose={() => {}} />)
		expect(screen.getByRole('button', { name: 'Close window' })).toBeDefined()
	})

	it('calls onClose when close button is clicked', async () => {
		const onClose = vi.fn()
		render(<SheetHeader onClose={onClose} />)
		await userEvent.click(screen.getByRole('button', { name: 'Close window' }))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('renders actions slot when provided', () => {
		render(
			<SheetHeader onClose={() => {}}>
				<button type="button">Custom Action</button>
			</SheetHeader>,
		)
		expect(screen.getByText('Custom Action')).toBeDefined()
	})

	it('renders without actions', () => {
		const { container } = render(<SheetHeader onClose={() => {}} />)
		expect(container.querySelector('[data-testid="sheet-header"]')).toBeDefined()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/sheet/__tests__/SheetHeader.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```tsx
// core/sheet/SheetHeader.tsx
'use client'

import type React from 'react'
import WindowControl from '@/core/entity/WindowControl'

interface SheetHeaderProps {
	onClose: () => void
	children?: React.ReactNode
}

export default function SheetHeader({ onClose, children }: SheetHeaderProps) {
	return (
		<div
			data-testid="sheet-header"
			className="flex items-center justify-between h-12 px-5 border-b border-outline bg-surface-raised"
		>
			<WindowControl onClick={onClose} />
			{children && <div className="flex items-center gap-2">{children}</div>}
		</div>
	)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/sheet/__tests__/SheetHeader.test.tsx`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add core/sheet/SheetHeader.tsx core/sheet/__tests__/SheetHeader.test.tsx
git commit -m "feat: add SheetHeader with close button and action slots"
```

---

### Task 3: SheetBody

**Files:**
- Create: `core/sheet/SheetBody.tsx`
- Create: `core/sheet/__tests__/SheetBody.test.tsx`

**Context:** The body is a scrollable container with edge-fade masking. The `scroll-fade` utility class already exists in `tokens/tokens.css` (lines 223-232) — it applies a CSS `mask-image` gradient to dissolve content at top/bottom edges.

**Step 1: Write the failing test**

```tsx
// core/sheet/__tests__/SheetBody.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SheetBody from '@/core/sheet/SheetBody'

describe('SheetBody', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders children', () => {
		render(
			<SheetBody>
				<p>Sheet content here</p>
			</SheetBody>,
		)
		expect(screen.getByText('Sheet content here')).toBeDefined()
	})

	it('has scroll-fade class for edge masking', () => {
		const { container } = render(
			<SheetBody>
				<p>Content</p>
			</SheetBody>,
		)
		const body = container.querySelector('[data-testid="sheet-body"]')
		expect(body?.className).toContain('scroll-fade')
	})

	it('has overflow-auto for scrolling', () => {
		const { container } = render(
			<SheetBody>
				<p>Content</p>
			</SheetBody>,
		)
		const body = container.querySelector('[data-testid="sheet-body"]')
		expect(body?.className).toContain('overflow-auto')
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/sheet/__tests__/SheetBody.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```tsx
// core/sheet/SheetBody.tsx
'use client'

import type React from 'react'

export default function SheetBody({ children }: { children: React.ReactNode }) {
	return (
		<div data-testid="sheet-body" className="flex-1 overflow-auto scroll-fade p-6">
			{children}
		</div>
	)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/sheet/__tests__/SheetBody.test.tsx`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add core/sheet/SheetBody.tsx core/sheet/__tests__/SheetBody.test.tsx
git commit -m "feat: add SheetBody with scroll-fade edge masking"
```

---

### Task 4: SheetBackdrop

**Files:**
- Create: `core/sheet/SheetBackdrop.tsx`
- Create: `core/sheet/__tests__/SheetBackdrop.test.tsx`

**Context:** The backdrop is a fixed overlay that dims the screen (`bg-black/40`). Clicking it calls `onClose`. It uses `motion/react` for fade-in/out animation. The backdrop itself doesn't scale the canvas — that's handled by `CanvasShell` (Task 6).

**Step 1: Write the failing test**

```tsx
// core/sheet/__tests__/SheetBackdrop.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SheetBackdrop from '@/core/sheet/SheetBackdrop'

describe('SheetBackdrop', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders backdrop overlay', () => {
		render(<SheetBackdrop onClose={() => {}} />)
		expect(screen.getByTestId('sheet-backdrop')).toBeDefined()
	})

	it('calls onClose on click', async () => {
		const onClose = vi.fn()
		render(<SheetBackdrop onClose={onClose} />)
		await userEvent.click(screen.getByTestId('sheet-backdrop'))
		expect(onClose).toHaveBeenCalledOnce()
	})

	it('has fixed positioning to cover viewport', () => {
		render(<SheetBackdrop onClose={() => {}} />)
		const backdrop = screen.getByTestId('sheet-backdrop')
		expect(backdrop.className).toContain('fixed')
		expect(backdrop.className).toContain('inset-0')
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/sheet/__tests__/SheetBackdrop.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```tsx
// core/sheet/SheetBackdrop.tsx
'use client'

import { motion } from 'motion/react'
import { DURATION, MOTION_EASE } from '@/lib/motion'

interface SheetBackdropProps {
	onClose: () => void
}

export default function SheetBackdrop({ onClose }: SheetBackdropProps) {
	return (
		<motion.div
			data-testid="sheet-backdrop"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: DURATION.medium, ease: MOTION_EASE.smooth }}
			className="fixed inset-0 bg-black/40"
			style={{ zIndex: 50 }}
			onClick={onClose}
		/>
	)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/sheet/__tests__/SheetBackdrop.test.tsx`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add core/sheet/SheetBackdrop.tsx core/sheet/__tests__/SheetBackdrop.test.tsx
git commit -m "feat: add SheetBackdrop dim overlay with click-to-dismiss"
```

---

### Task 5: FullScreenSheet

**Files:**
- Create: `core/sheet/FullScreenSheet.tsx`
- Create: `core/sheet/__tests__/FullScreenSheet.test.tsx`

**Context:** The main container component. Renders via React `createPortal` to `document.body`. Uses `AnimatePresence` for enter/exit. Slides up from bottom with `gentle` spring from `lib/motion.ts`. Composes `SheetBackdrop`, `SheetHeader`, and `SheetBody`. Handles Escape key dismiss.

**Important refs:**
- `lib/motion.ts` line 13: `gentle: { type: 'spring', stiffness: 200, damping: 20, mass: 1 }`
- `tokens/tokens.css`: `--shadow-overlay`, `--radius-2xl: 20px`
- The sheet must be `z-index: 51` (above backdrop at 50)

**Step 1: Write the failing test**

```tsx
// core/sheet/__tests__/FullScreenSheet.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSheetStore } from '@/core/sheetStore'
import FullScreenSheet from '@/core/sheet/FullScreenSheet'

describe('FullScreenSheet', () => {
	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

	it('does not render when store is closed', () => {
		render(<FullScreenSheet>{() => <p>Content</p>}</FullScreenSheet>)
		expect(screen.queryByTestId('sheet-backdrop')).toBeNull()
	})

	it('renders backdrop and header when store is open', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(<FullScreenSheet>{() => <p>Content</p>}</FullScreenSheet>)
		expect(screen.getByTestId('sheet-backdrop')).toBeDefined()
		expect(screen.getByTestId('sheet-header')).toBeDefined()
	})

	it('renders children content when open', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(<FullScreenSheet>{() => <p>Sheet content</p>}</FullScreenSheet>)
		expect(screen.getByText('Sheet content')).toBeDefined()
	})

	it('closes on Escape key', async () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(<FullScreenSheet>{() => <p>Content</p>}</FullScreenSheet>)
		await userEvent.keyboard('{Escape}')
		expect(useSheetStore.getState().isOpen).toBe(false)
	})

	it('closes on backdrop click', async () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(<FullScreenSheet>{() => <p>Content</p>}</FullScreenSheet>)
		await userEvent.click(screen.getByTestId('sheet-backdrop'))
		expect(useSheetStore.getState().isOpen).toBe(false)
	})

	it('passes entityId and contentType to children render prop', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(
			<FullScreenSheet>
				{({ entityId, contentType }) => (
					<p>
						{entityId}-{contentType}
					</p>
				)}
			</FullScreenSheet>,
		)
		expect(screen.getByText('entity-1-entity')).toBeDefined()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/sheet/__tests__/FullScreenSheet.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```tsx
// core/sheet/FullScreenSheet.tsx
'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import SheetBackdrop from '@/core/sheet/SheetBackdrop'
import SheetBody from '@/core/sheet/SheetBody'
import SheetHeader from '@/core/sheet/SheetHeader'
import { type SheetContentType, useSheetStore } from '@/core/sheetStore'
import { SPRING } from '@/lib/motion'

interface SheetRenderProps {
	entityId: string | null
	contentType: SheetContentType | null
}

interface FullScreenSheetProps {
	children: (props: SheetRenderProps) => React.ReactNode
	actions?: React.ReactNode
}

export default function FullScreenSheet({ children, actions }: FullScreenSheetProps) {
	const isOpen = useSheetStore((s) => s.isOpen)
	const entityId = useSheetStore((s) => s.entityId)
	const contentType = useSheetStore((s) => s.contentType)
	const close = useSheetStore((s) => s.close)

	useEffect(() => {
		if (!isOpen) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				close()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isOpen, close])

	if (typeof document === 'undefined') return null

	return createPortal(
		<AnimatePresence>
			{isOpen && (
				<>
					<SheetBackdrop onClose={close} />
					<motion.div
						data-testid="full-screen-sheet"
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={SPRING.gentle}
						className="fixed inset-x-0 bottom-0 flex flex-col bg-surface-raised rounded-t-2xl shadow-overlay"
						style={{
							zIndex: 51,
							top: 48, // leave ~48px of canvas visible at top
						}}
					>
						<SheetHeader onClose={close}>{actions}</SheetHeader>
						<SheetBody>{children({ entityId, contentType })}</SheetBody>
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body,
	)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/sheet/__tests__/FullScreenSheet.test.tsx`
Expected: 6 tests PASS

**Step 5: Commit**

```bash
git add core/sheet/FullScreenSheet.tsx core/sheet/__tests__/FullScreenSheet.test.tsx
git commit -m "feat: add FullScreenSheet with portal, spring animation, and keyboard dismiss"
```

---

### Task 6: CanvasShell (Scale + Lock)

**Files:**
- Create: `core/canvas/CanvasShell.tsx`
- Create: `core/canvas/__tests__/CanvasShell.test.tsx`
- Modify: `app/space/[id]/page.tsx` — wrap canvas area with CanvasShell

**Context:** When the sheet opens, the canvas scales to `scale(0.96)` with `transform-origin: top center` and becomes non-interactive (`pointer-events: none`). The `CanvasShell` client component subscribes to `sheetStore.isOpen` and applies these styles. The space page (`app/space/[id]/page.tsx` line 21) has the canvas wrapper — we replace it with CanvasShell.

**Step 1: Write the failing test**

```tsx
// core/canvas/__tests__/CanvasShell.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CanvasShell from '@/core/canvas/CanvasShell'
import { useSheetStore } from '@/core/sheetStore'

describe('CanvasShell', () => {
	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

	it('renders children', () => {
		render(
			<CanvasShell>
				<p>Canvas content</p>
			</CanvasShell>,
		)
		expect(screen.getByText('Canvas content')).toBeDefined()
	})

	it('does not scale when sheet is closed', () => {
		render(
			<CanvasShell>
				<p>Content</p>
			</CanvasShell>,
		)
		const shell = screen.getByTestId('canvas-shell')
		expect(shell.style.transform).toBe('')
	})

	it('scales down when sheet is open', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(
			<CanvasShell>
				<p>Content</p>
			</CanvasShell>,
		)
		const shell = screen.getByTestId('canvas-shell')
		expect(shell.style.transform).toBe('scale(0.96)')
	})

	it('disables pointer events when sheet is open', () => {
		useSheetStore.getState().open('entity-1', 'entity')
		render(
			<CanvasShell>
				<p>Content</p>
			</CanvasShell>,
		)
		const shell = screen.getByTestId('canvas-shell')
		expect(shell.style.pointerEvents).toBe('none')
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/canvas/__tests__/CanvasShell.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```tsx
// core/canvas/CanvasShell.tsx
'use client'

import type React from 'react'
import { useSheetStore } from '@/core/sheetStore'
import { DURATION } from '@/lib/motion'

export default function CanvasShell({ children }: { children: React.ReactNode }) {
	const isSheetOpen = useSheetStore((s) => s.isOpen)

	return (
		<div
			data-testid="canvas-shell"
			className="absolute inset-3 rounded-lg bg-surface-sunken overflow-hidden"
			style={{
				transformOrigin: 'top center',
				transition: `transform ${DURATION.medium}s ease-out`,
				...(isSheetOpen
					? { transform: 'scale(0.96)', pointerEvents: 'none' as const }
					: {}),
			}}
		>
			{children}
		</div>
	)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/canvas/__tests__/CanvasShell.test.tsx`
Expected: 4 tests PASS

**Step 5: Modify space page to use CanvasShell**

Replace the static canvas wrapper in `app/space/[id]/page.tsx` (line 21):

```tsx
// BEFORE (line 21):
<div className="absolute inset-3 rounded-lg bg-surface-sunken overflow-hidden">

// AFTER:
<CanvasShell>
```

Remove the closing `</div>` on line 23 and replace with `</CanvasShell>`.

Add import at top: `import CanvasShell from '@/core/canvas/CanvasShell'`

The final page should look like:

```tsx
import { redirect } from 'next/navigation'
import CanvasShell from '@/core/canvas/CanvasShell'
import MockDataLoader from '@/core/canvas/MockDataLoader'
import SpaceRenderer from '@/core/canvas/SpaceRenderer'
import AgentChat from '@/core/chat/AgentChat'
import FullScreenSheet from '@/core/sheet/FullScreenSheet'
import AppRenderer from '@/core/entity/AppRenderer'
import { useEntityStore } from '@/core/entityStore'
import { getSupabaseServerClient } from '@/core/supabase/server'

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const supabase = await getSupabaseServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		redirect('/')
	}

	return (
		<div className="h-screen bg-surface">
			<MockDataLoader />
			<CanvasShell>
				<SpaceRenderer spaceId={id} />
			</CanvasShell>
			<AgentChat spaceId={id} userId={user.id} />
			<FullScreenSheet>
				{({ entityId, contentType }) => {
					if (contentType === 'entity' && entityId) {
						// TODO: Replace with RichEditor once Tiptap is integrated (Task 10)
						return <SheetEntityContent entityId={entityId} />
					}
					return <p className="text-on-surface-muted">No content</p>
				}}
			</FullScreenSheet>
		</div>
	)
}
```

**Note:** The `SheetEntityContent` is a small client component we'll add inline or as a separate file — it reads the entity from the store and renders `AppRenderer` in sheet mode. For now, create it as a simple client wrapper:

```tsx
// Create: core/sheet/SheetEntityContent.tsx
'use client'

import AppRenderer from '@/core/entity/AppRenderer'
import { useEntityStore } from '@/core/entityStore'

export default function SheetEntityContent({ entityId }: { entityId: string }) {
	const entity = useEntityStore((s) => s.entities[entityId])
	if (!entity) return <p className="text-on-surface-muted">Entity not found</p>
	return <AppRenderer entity={entity} mode="sheet" />
}
```

**Step 6: Commit**

```bash
git add core/canvas/CanvasShell.tsx core/canvas/__tests__/CanvasShell.test.tsx core/sheet/SheetEntityContent.tsx app/space/[id]/page.tsx
git commit -m "feat: add CanvasShell with sheet-aware scale, wire sheet into space page"
```

---

### Task 7: Wire CanvasCard Maximize Button

**Files:**
- Modify: `core/entity/CanvasCard.tsx:48-51` — wire maximize onClick to sheetStore.open()
- Modify: `core/entity/__tests__/CanvasCard.test.tsx` — add test for maximize opening sheet

**Context:** The maximize button in `CanvasCard.tsx` (line 61-64) currently has a `// TODO: wire to bottom sheet expand` comment. Replace with `useSheetStore.getState().open(entity.id, 'entity')`.

**Step 1: Write the failing test**

Add to `core/entity/__tests__/CanvasCard.test.tsx`:

```tsx
import { useSheetStore } from '@/core/sheetStore'

// Add to the existing describe block:
it('maximize button opens sheet with entity id', async () => {
	const entity = makeEntity({ id: 'card-1', summary: 'Test card' })
	render(<CanvasCard entity={entity} />)
	const btn = screen.getByRole('button', { name: 'Maximize' })
	await userEvent.click(btn)
	const state = useSheetStore.getState()
	expect(state.isOpen).toBe(true)
	expect(state.entityId).toBe('card-1')
	expect(state.contentType).toBe('entity')
})
```

Add `userEvent` import: `import userEvent from '@testing-library/user-event'`

Add cleanup of sheet store in `afterEach`:
```tsx
afterEach(() => {
	useSheetStore.getState().close()
	cleanup()
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/entity/__tests__/CanvasCard.test.tsx`
Expected: FAIL — `useSheetStore.getState().isOpen` is `false` after click (because the handler is still a TODO comment)

**Step 3: Wire the maximize button**

In `core/entity/CanvasCard.tsx`, add import:

```tsx
import { useSheetStore } from '@/core/sheetStore'
```

Replace the maximize button onClick (lines 61-64):

```tsx
// BEFORE:
onClick={(e) => {
	e.stopPropagation()
	// TODO: wire to bottom sheet expand
}}

// AFTER:
onClick={(e) => {
	e.stopPropagation()
	useSheetStore.getState().open(entity.id, 'entity')
}}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/entity/__tests__/CanvasCard.test.tsx`
Expected: All tests PASS (including the new one)

**Step 5: Commit**

```bash
git add core/entity/CanvasCard.tsx core/entity/__tests__/CanvasCard.test.tsx
git commit -m "feat: wire card maximize button to open full-screen sheet"
```

---

### Task 8: Integration Test — Full Sheet Flow

**Files:**
- Create: `core/sheet/__tests__/sheet-integration.test.tsx`

**Context:** End-to-end test verifying: card maximize → sheet opens → backdrop visible → close → sheet gone. This validates the full wiring across components.

**Step 1: Write the integration test**

```tsx
// core/sheet/__tests__/sheet-integration.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import FullScreenSheet from '@/core/sheet/FullScreenSheet'
import { useSheetStore } from '@/core/sheetStore'

describe('Sheet integration', () => {
	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

	it('full open-close cycle via store', async () => {
		render(
			<FullScreenSheet>
				{({ entityId }) => <p>Viewing {entityId}</p>}
			</FullScreenSheet>,
		)

		// Initially closed
		expect(screen.queryByTestId('full-screen-sheet')).toBeNull()

		// Open via store
		useSheetStore.getState().open('test-entity', 'entity')

		// Sheet appears with content
		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()
		expect(screen.getByText('Viewing test-entity')).toBeDefined()
		expect(screen.getByTestId('sheet-backdrop')).toBeDefined()

		// Close via close button
		await userEvent.click(screen.getByRole('button', { name: 'Close window' }))
		expect(useSheetStore.getState().isOpen).toBe(false)
	})

	it('Escape key dismisses sheet', async () => {
		render(
			<FullScreenSheet>
				{() => <p>Content</p>}
			</FullScreenSheet>,
		)

		useSheetStore.getState().open('test-entity', 'entity')
		expect(await screen.findByTestId('full-screen-sheet')).toBeDefined()

		await userEvent.keyboard('{Escape}')
		expect(useSheetStore.getState().isOpen).toBe(false)
	})
})
```

**Step 2: Run test**

Run: `npx vitest run core/sheet/__tests__/sheet-integration.test.tsx`
Expected: 2 tests PASS

**Step 3: Run all tests to verify nothing is broken**

Run: `npx vitest run`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add core/sheet/__tests__/sheet-integration.test.tsx
git commit -m "test: add sheet integration tests for open-close cycle"
```

---

## Phase 2: Rich Text Editor (Tiptap)

### Task 9: Install Tiptap Dependencies

**Files:**
- Modify: `package.json` (via npm install)

**Context:** The architecture doc already lists `@tiptap/react` as a dependency. We need to install the full set: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-placeholder`, and `mermaid`.

**Step 1: Install packages**

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-placeholder mermaid
```

**Step 2: Verify installation**

```bash
npx vitest run
```

Expected: All existing tests still PASS (no breakage from new deps)

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Tiptap and mermaid dependencies"
```

---

### Task 10: Basic RichEditor Component

**Files:**
- Create: `core/editor/RichEditor.tsx`
- Create: `core/editor/__tests__/RichEditor.test.tsx`

**Context:** A Tiptap editor that loads entity content (stored as Tiptap JSON string in `entity.content`), renders WYSIWYG, and saves on change. Uses `@tiptap/starter-kit` for base editing (headings, bold, italic, lists, code blocks, blockquotes). Uses `@tiptap/extension-placeholder` for empty state. No toolbar — users use Markdown shortcuts (`# ` for heading, `**text**` for bold, etc.).

**Refs:**
- `@tiptap/react` provides `useEditor` hook and `EditorContent` component
- `entity.content` is currently a plain string. When Tiptap JSON is stored, it's a serialized JSON string. Empty string = empty document.

**Step 1: Write the failing test**

```tsx
// core/editor/__tests__/RichEditor.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import RichEditor from '@/core/editor/RichEditor'
import type { Entity } from '@/lib/types'

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'entity-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'card',
		position: { x: 0, y: 0, locked: false },
		size: { width: 280, height: 200 },
		z_index: 1,
		content: '',
		state: {},
		summary: '',
		created_by: 'user',
		archived: false,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		...overrides,
	}
}

describe('RichEditor', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders editor container', () => {
		const entity = makeEntity()
		render(<RichEditor entity={entity} />)
		expect(screen.getByTestId('rich-editor')).toBeDefined()
	})

	it('renders entity content as text', () => {
		// Plain string content renders as a paragraph
		const entity = makeEntity({ content: 'Hello world' })
		render(<RichEditor entity={entity} />)
		expect(screen.getByText('Hello world')).toBeDefined()
	})

	it('renders Tiptap JSON content', () => {
		const tiptapJson = JSON.stringify({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'From Tiptap JSON' }],
				},
			],
		})
		const entity = makeEntity({ content: tiptapJson })
		render(<RichEditor entity={entity} />)
		expect(screen.getByText('From Tiptap JSON')).toBeDefined()
	})

	it('renders placeholder when content is empty', () => {
		const entity = makeEntity({ content: '' })
		render(<RichEditor entity={entity} />)
		const editor = screen.getByTestId('rich-editor')
		// Tiptap placeholder renders via CSS :before pseudo-element or data attribute
		expect(editor.querySelector('.tiptap')).toBeDefined()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/editor/__tests__/RichEditor.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```tsx
// core/editor/RichEditor.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import type { Entity } from '@/lib/types'

function parseContent(content: string): string | Record<string, unknown> {
	if (!content) return ''
	try {
		const parsed = JSON.parse(content)
		if (parsed?.type === 'doc') return parsed
		return content
	} catch {
		return content
	}
}

interface RichEditorProps {
	entity: Entity
}

export default function RichEditor({ entity }: RichEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit,
			Image,
			Placeholder.configure({
				placeholder: 'Start writing...',
			}),
		],
		content: parseContent(entity.content),
		editorProps: {
			attributes: {
				class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px]',
			},
		},
		// TODO: debounced save to entityStore on update (Task 12)
	})

	return (
		<div data-testid="rich-editor">
			<EditorContent editor={editor} />
		</div>
	)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/editor/__tests__/RichEditor.test.tsx`
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add core/editor/RichEditor.tsx core/editor/__tests__/RichEditor.test.tsx
git commit -m "feat: add RichEditor with Tiptap starter-kit and placeholder"
```

---

### Task 11: MermaidBlock Extension

**Files:**
- Create: `core/editor/extensions/MermaidBlock.tsx`
- Create: `core/editor/extensions/__tests__/MermaidBlock.test.tsx`

**Context:** A custom Tiptap node extension that accepts Mermaid diagram source and renders the SVG inline. User sees only the rendered diagram by default — the Mermaid markdown source is stored in the node's attributes. Uses the `mermaid` library for rendering.

**Key decisions:**
- Node type: `mermaidBlock` (block-level, not inline)
- Attributes: `source` (string — the Mermaid diagram definition)
- Rendering: a React `NodeViewWrapper` that calls `mermaid.render()` and injects the SVG
- Toggle: clicking the rendered diagram could show source (future — TODO for now)

**Step 1: Write the failing test**

```tsx
// core/editor/extensions/__tests__/MermaidBlock.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { afterEach, describe, expect, it } from 'vitest'
import { MermaidBlock } from '@/core/editor/extensions/MermaidBlock'

function TestEditor({ content }: { content: Record<string, unknown> }) {
	const editor = useEditor({
		extensions: [StarterKit, MermaidBlock],
		content,
	})
	return (
		<div data-testid="test-editor">
			<EditorContent editor={editor} />
		</div>
	)
}

describe('MermaidBlock', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders mermaid node view wrapper', () => {
		const content = {
			type: 'doc',
			content: [
				{
					type: 'mermaidBlock',
					attrs: { source: 'graph TD; A-->B;' },
				},
			],
		}
		render(<TestEditor content={content} />)
		expect(screen.getByTestId('test-editor').querySelector('[data-mermaid-block]')).not.toBeNull()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/editor/extensions/__tests__/MermaidBlock.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```tsx
// core/editor/extensions/MermaidBlock.tsx
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'neutral' })

function MermaidNodeView({ node }: { node: { attrs: { source: string } } }) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const source = node.attrs.source
		if (!source || !containerRef.current) return

		let cancelled = false
		const id = `mermaid-${Math.random().toString(36).slice(2)}`

		mermaid
			.render(id, source)
			.then(({ svg }) => {
				if (!cancelled && containerRef.current) {
					containerRef.current.innerHTML = svg
					setError(null)
				}
			})
			.catch((err) => {
				if (!cancelled) {
					setError(err.message || 'Failed to render diagram')
				}
			})

		return () => {
			cancelled = true
		}
	}, [node.attrs.source])

	return (
		<NodeViewWrapper data-mermaid-block="">
			{error ? (
				<div className="p-3 text-sm text-error bg-surface-sunken rounded-lg">{error}</div>
			) : (
				<div ref={containerRef} className="flex justify-center py-2" />
			)}
		</NodeViewWrapper>
	)
}

export const MermaidBlock = Node.create({
	name: 'mermaidBlock',
	group: 'block',
	atom: true,

	addAttributes() {
		return {
			source: { default: '' },
		}
	},

	parseHTML() {
		return [{ tag: 'div[data-mermaid-block]' }]
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-mermaid-block': '' })]
	},

	addNodeView() {
		return ReactNodeViewRenderer(MermaidNodeView)
	},
})
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/editor/extensions/__tests__/MermaidBlock.test.tsx`
Expected: 1 test PASS

**Step 5: Add MermaidBlock to RichEditor**

In `core/editor/RichEditor.tsx`, add import:
```tsx
import { MermaidBlock } from '@/core/editor/extensions/MermaidBlock'
```

Add to extensions array:
```tsx
extensions: [StarterKit, Image, Placeholder.configure({ ... }), MermaidBlock],
```

**Step 6: Commit**

```bash
git add core/editor/extensions/MermaidBlock.tsx core/editor/extensions/__tests__/MermaidBlock.test.tsx core/editor/RichEditor.tsx
git commit -m "feat: add MermaidBlock Tiptap extension for inline diagram rendering"
```

---

### Task 12: Entity Content Save (Debounced)

**Files:**
- Modify: `core/entityStore.ts` — add `updateContent(id, json)` action
- Modify: `core/__tests__/sheetStore.test.ts` — add updateContent test (or create dedicated test)
- Modify: `core/editor/RichEditor.tsx` — add `onUpdate` handler with debounce

**Context:** When the user edits in the RichEditor, changes must persist to the entity store. The save is debounced (300ms) to avoid store churn on every keystroke. Content is stored as serialized Tiptap JSON string.

**Step 1: Add updateContent to entityStore**

Add test to `core/__tests__/sheetStore.test.ts` (or a new file):

```ts
// Add to entityStore tests (create core/__tests__/entityStore.test.ts if needed)
import { useEntityStore } from '@/core/entityStore'

it('updateContent changes entity content', () => {
	const entity = { /* full entity object */ }
	useEntityStore.getState().upsert(entity)
	useEntityStore.getState().updateContent('entity-1', '{"type":"doc","content":[]}')
	expect(useEntityStore.getState().entities['entity-1'].content).toBe('{"type":"doc","content":[]}')
})
```

**Step 2: Add updateContent to entityStore.ts**

In the store interface, add:
```ts
updateContent: (id: string, content: string) => void
```

In the store implementation:
```ts
updateContent: (id, content) => {
	const entity = get().entities[id]
	if (!entity) return
	set((state) => ({
		entities: {
			...state.entities,
			[id]: { ...state.entities[id], content, updated_at: new Date().toISOString() },
		},
	}))
},
```

**Step 3: Add debounced save to RichEditor**

```tsx
// In RichEditor.tsx, add to useEditor config:
onUpdate: ({ editor }) => {
	// Debounced save — clear previous timer, set new one
	if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
	saveTimerRef.current = setTimeout(() => {
		const json = JSON.stringify(editor.getJSON())
		useEntityStore.getState().updateContent(entity.id, json)
	}, 300)
},
```

Add a ref at component level:
```tsx
const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

Add cleanup:
```tsx
useEffect(() => {
	return () => {
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
	}
}, [])
```

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All PASS

**Step 5: Commit**

```bash
git add core/entityStore.ts core/editor/RichEditor.tsx core/__tests__/entityStore.test.ts
git commit -m "feat: debounced content save from RichEditor to entityStore"
```

---

### Task 13: Wire RichEditor into Sheet

**Files:**
- Modify: `core/sheet/SheetEntityContent.tsx` — replace AppRenderer with RichEditor for note entities

**Context:** When a card is maximized into the sheet, the `SheetEntityContent` component currently renders `AppRenderer` in sheet mode. Replace this with `RichEditor` for note-type entities. Other entity types continue using `AppRenderer`.

**Step 1: Modify SheetEntityContent**

```tsx
// core/sheet/SheetEntityContent.tsx
'use client'

import AppRenderer from '@/core/entity/AppRenderer'
import RichEditor from '@/core/editor/RichEditor'
import { useEntityStore } from '@/core/entityStore'

export default function SheetEntityContent({ entityId }: { entityId: string }) {
	const entity = useEntityStore((s) => s.entities[entityId])
	if (!entity) return <p className="text-on-surface-muted">Entity not found</p>

	// Notes use the rich editor in sheet mode
	if (entity.type === 'note') {
		return <RichEditor entity={entity} />
	}

	return <AppRenderer entity={entity} mode="sheet" />
}
```

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All PASS

**Step 3: Commit**

```bash
git add core/sheet/SheetEntityContent.tsx
git commit -m "feat: wire RichEditor into sheet for note entities"
```

---

## Phase 3: Agent Streaming

### Task 14: Agent Streaming State

**Files:**
- Modify: `core/sheetStore.ts` — add streaming state and actions
- Modify: `core/__tests__/sheetStore.test.ts` — add streaming tests

**Context:** The sheet store needs to track whether the agent is streaming content and where the agent cursor is. These fields are used by the RichEditor to show/hide the agent cursor and insert tokens.

**Step 1: Add streaming tests**

```ts
// Add to core/__tests__/sheetStore.test.ts
it('streaming starts as false', () => {
	expect(useSheetStore.getState().agentStreaming).toBe(false)
})

it('startStreaming sets agentStreaming true', () => {
	useSheetStore.getState().open('entity-1', 'entity')
	useSheetStore.getState().startStreaming()
	expect(useSheetStore.getState().agentStreaming).toBe(true)
})

it('stopStreaming sets agentStreaming false', () => {
	useSheetStore.getState().open('entity-1', 'entity')
	useSheetStore.getState().startStreaming()
	useSheetStore.getState().stopStreaming()
	expect(useSheetStore.getState().agentStreaming).toBe(false)
})

it('pauseStreaming sets streamPaused true', () => {
	useSheetStore.getState().open('entity-1', 'entity')
	useSheetStore.getState().startStreaming()
	useSheetStore.getState().pauseStreaming()
	expect(useSheetStore.getState().streamPaused).toBe(true)
})

it('resumeStreaming sets streamPaused false', () => {
	useSheetStore.getState().open('entity-1', 'entity')
	useSheetStore.getState().startStreaming()
	useSheetStore.getState().pauseStreaming()
	useSheetStore.getState().resumeStreaming()
	expect(useSheetStore.getState().streamPaused).toBe(false)
})

it('close() resets streaming state', () => {
	useSheetStore.getState().open('entity-1', 'entity')
	useSheetStore.getState().startStreaming()
	useSheetStore.getState().close()
	expect(useSheetStore.getState().agentStreaming).toBe(false)
	expect(useSheetStore.getState().streamPaused).toBe(false)
})
```

**Step 2: Extend sheetStore**

Add to interface:
```ts
agentStreaming: boolean
streamPaused: boolean
agentCursorPosition: number | null
startStreaming: () => void
stopStreaming: () => void
pauseStreaming: () => void
resumeStreaming: () => void
setAgentCursorPosition: (pos: number | null) => void
```

Add to implementation:
```ts
agentStreaming: false,
streamPaused: false,
agentCursorPosition: null,

startStreaming: () => set({ agentStreaming: true, streamPaused: false }),
stopStreaming: () => set({ agentStreaming: false, streamPaused: false, agentCursorPosition: null }),
pauseStreaming: () => set({ streamPaused: true }),
resumeStreaming: () => set({ streamPaused: false }),
setAgentCursorPosition: (pos) => set({ agentCursorPosition: pos }),
```

Update `close()` to also reset streaming:
```ts
close: () => set({
	isOpen: false,
	entityId: null,
	contentType: null,
	agentStreaming: false,
	streamPaused: false,
	agentCursorPosition: null,
}),
```

**Step 3: Run tests**

Run: `npx vitest run core/__tests__/sheetStore.test.ts`
Expected: All PASS

**Step 4: Commit**

```bash
git add core/sheetStore.ts core/__tests__/sheetStore.test.ts
git commit -m "feat: add agent streaming state to sheetStore"
```

---

### Task 15: AgentCursor Extension

**Files:**
- Create: `core/editor/extensions/AgentCursor.tsx`
- Create: `core/editor/extensions/__tests__/AgentCursor.test.tsx`

**Context:** A Tiptap decoration that renders a thick pill-shaped vertical bar at the agent's cursor position. Uses `--accent` color with agent glow. The decoration subscribes to `sheetStore.agentCursorPosition` and updates when the position changes. Pulses while streaming.

**Key design from brainstorming:** Thick vertical bar with 100% corner radii (pill shape), accent color, agent glow, pulses while receiving tokens.

**Step 1: Write the failing test**

```tsx
// core/editor/extensions/__tests__/AgentCursor.test.tsx
import { describe, expect, it } from 'vitest'
import { AgentCursor } from '@/core/editor/extensions/AgentCursor'

describe('AgentCursor', () => {
	it('exports a Tiptap extension', () => {
		expect(AgentCursor).toBeDefined()
		expect(AgentCursor.name).toBe('agentCursor')
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/editor/extensions/__tests__/AgentCursor.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```tsx
// core/editor/extensions/AgentCursor.tsx
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const agentCursorKey = new PluginKey('agentCursor')

export const AgentCursor = Extension.create({
	name: 'agentCursor',

	addOptions() {
		return {
			position: null as number | null,
			streaming: false,
		}
	},

	addProseMirrorPlugins() {
		const extension = this

		return [
			new Plugin({
				key: agentCursorKey,
				props: {
					decorations(state) {
						const pos = extension.options.position
						if (pos === null || pos === undefined) return DecorationSet.empty
						if (pos < 0 || pos > state.doc.content.size) return DecorationSet.empty

						const widget = Decoration.widget(pos, () => {
							const cursor = document.createElement('span')
							cursor.className = 'agent-cursor'
							cursor.setAttribute('data-agent-cursor', '')
							if (extension.options.streaming) {
								cursor.setAttribute('data-streaming', '')
							}
							return cursor
						})

						return DecorationSet.create(state.doc, [widget])
					},
				},
			}),
		]
	},
})
```

**Step 4: Add agent cursor CSS to tokens.css**

Add to `tokens/tokens.css` inside `@layer utilities`:

```css
.agent-cursor {
	display: inline-block;
	width: 3px;
	height: 1.2em;
	border-radius: 9999px;
	background-color: var(--primary);
	box-shadow: var(--shadow-agent-glow);
	vertical-align: text-bottom;
	margin: 0 1px;
}

.agent-cursor[data-streaming] {
	animation: agent-cursor-pulse 1s ease-in-out infinite;
}

@keyframes agent-cursor-pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.5; }
}
```

**Step 5: Run tests**

Run: `npx vitest run core/editor/extensions/__tests__/AgentCursor.test.tsx`
Expected: 1 test PASS

**Step 6: Add AgentCursor to RichEditor**

In `core/editor/RichEditor.tsx`, add import and extension:

```tsx
import { AgentCursor } from '@/core/editor/extensions/AgentCursor'
import { useSheetStore } from '@/core/sheetStore'
```

Subscribe to streaming state:
```tsx
const agentStreaming = useSheetStore((s) => s.agentStreaming)
const agentCursorPosition = useSheetStore((s) => s.agentCursorPosition)
```

Add to extensions array:
```tsx
AgentCursor.configure({
	position: agentCursorPosition,
	streaming: agentStreaming,
}),
```

**Step 7: Commit**

```bash
git add core/editor/extensions/AgentCursor.tsx core/editor/extensions/__tests__/AgentCursor.test.tsx core/editor/RichEditor.tsx tokens/tokens.css
git commit -m "feat: add AgentCursor Tiptap extension with pill cursor and pulse animation"
```

---

### Task 16: Soft Simultaneous Editing (Pause/Resume)

**Files:**
- Modify: `core/editor/RichEditor.tsx` — add focus/blur handlers for pause/resume

**Context:** When the agent is streaming and the user clicks into the editor to edit, streaming pauses. When the user clicks away (blurs the editor), streaming resumes. This is the "soft simultaneous" model from the design.

**Step 1: Add focus/blur handlers to RichEditor**

In the `useEditor` config, add:

```tsx
onFocus: () => {
	const { agentStreaming, pauseStreaming } = useSheetStore.getState()
	if (agentStreaming) {
		pauseStreaming()
	}
},

onBlur: () => {
	const { streamPaused, resumeStreaming } = useSheetStore.getState()
	if (streamPaused) {
		resumeStreaming()
	}
},
```

**Step 2: Add test for pause/resume behavior**

```tsx
// Add to core/editor/__tests__/RichEditor.test.tsx
it('pauses streaming on editor focus when agent is streaming', () => {
	useSheetStore.getState().open('entity-1', 'entity')
	useSheetStore.getState().startStreaming()

	const entity = makeEntity()
	render(<RichEditor entity={entity} />)

	// Simulate focus on the editor
	const editor = screen.getByTestId('rich-editor').querySelector('.tiptap')
	editor?.dispatchEvent(new FocusEvent('focus', { bubbles: true }))

	expect(useSheetStore.getState().streamPaused).toBe(true)
})
```

**Step 3: Run tests**

Run: `npx vitest run core/editor/__tests__/RichEditor.test.tsx`
Expected: All PASS

**Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All PASS

**Step 5: Commit**

```bash
git add core/editor/RichEditor.tsx core/editor/__tests__/RichEditor.test.tsx
git commit -m "feat: soft simultaneous editing — pause/resume streaming on user focus"
```

---

## Summary

| Phase | Tasks | What ships |
|-------|-------|------------|
| **1: Sheet Container** | 1–8 | Sheet opens/closes, canvas scales, card maximize wired, integration tested |
| **2: Rich Editor** | 9–13 | Tiptap editor with Mermaid blocks, entity content save, wired into sheet |
| **3: Agent Streaming** | 14–16 | Streaming state, agent cursor decoration, soft simultaneous editing |

**Total:** 16 tasks, ~30 test cases, 12 new files, 5 modified files.
