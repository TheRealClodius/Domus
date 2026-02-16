# Dark Mode + Settings App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Settings app with a Light/Dark/System theme toggle so users can switch to dark mode.

**Architecture:** A Zustand `useThemeStore` manages theme mode (`light`/`dark`/`system`), resolves the effective theme via `matchMedia`, persists to `localStorage`, and applies `data-theme` to `<html>`. A Settings `BuiltInApp` renders a three-option segmented toggle using existing pill button variants.

**Tech Stack:** Zustand, React 19, Tailwind v4, lucide-react, Vitest + Testing Library

---

### Task 1: Theme Store

**Files:**
- Create: `core/themeStore.ts`
- Test: `core/__tests__/themeStore.test.ts`

**Step 1: Write the failing tests**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useThemeStore } from '@/core/themeStore'

// Mock matchMedia
function mockMatchMedia(matches: boolean) {
	const listeners: Array<(e: { matches: boolean }) => void> = []
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockReturnValue({
			matches,
			addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
			removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
				const i = listeners.indexOf(cb)
				if (i >= 0) listeners.splice(i, 1)
			},
		}),
	})
	return { fire: (m: boolean) => listeners.forEach((cb) => cb({ matches: m })) }
}

describe('themeStore', () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.setAttribute('data-theme', 'light')
		useThemeStore.setState({ mode: 'light', resolved: 'light' })
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('defaults to light mode', () => {
		const { mode, resolved } = useThemeStore.getState()
		expect(mode).toBe('light')
		expect(resolved).toBe('light')
	})

	it('setMode("dark") updates mode, resolved, localStorage, and data-theme', () => {
		useThemeStore.getState().setMode('dark')
		const { mode, resolved } = useThemeStore.getState()
		expect(mode).toBe('dark')
		expect(resolved).toBe('dark')
		expect(localStorage.getItem('domus-theme')).toBe('dark')
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
	})

	it('setMode("light") switches back', () => {
		useThemeStore.getState().setMode('dark')
		useThemeStore.getState().setMode('light')
		expect(useThemeStore.getState().resolved).toBe('light')
		expect(document.documentElement.getAttribute('data-theme')).toBe('light')
	})

	it('setMode("system") resolves from matchMedia', () => {
		mockMatchMedia(true) // prefers dark
		useThemeStore.getState().setMode('system')
		expect(useThemeStore.getState().mode).toBe('system')
		expect(useThemeStore.getState().resolved).toBe('dark')
		expect(localStorage.getItem('domus-theme')).toBe('system')
	})

	it('system mode reacts to matchMedia changes', () => {
		const { fire } = mockMatchMedia(false)
		useThemeStore.getState().setMode('system')
		expect(useThemeStore.getState().resolved).toBe('light')

		fire(true)
		expect(useThemeStore.getState().resolved).toBe('dark')
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
	})

	it('switching away from system stops listening to matchMedia', () => {
		const { fire } = mockMatchMedia(false)
		useThemeStore.getState().setMode('system')
		useThemeStore.getState().setMode('light')

		fire(true) // should be ignored
		expect(useThemeStore.getState().resolved).toBe('light')
	})

	it('hydrate reads from localStorage', () => {
		localStorage.setItem('domus-theme', 'dark')
		useThemeStore.getState().hydrate()
		expect(useThemeStore.getState().mode).toBe('dark')
		expect(useThemeStore.getState().resolved).toBe('dark')
	})
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run core/__tests__/themeStore.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```ts
import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeState {
	mode: ThemeMode
	resolved: ResolvedTheme
	setMode: (mode: ThemeMode) => void
	hydrate: () => void
}

const STORAGE_KEY = 'domus-theme'

let mediaCleanup: (() => void) | null = null

function applyTheme(resolved: ResolvedTheme) {
	document.documentElement.setAttribute('data-theme', resolved)
}

function resolveSystem(): ResolvedTheme {
	if (typeof window === 'undefined') return 'light'
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function listenSystem(onChange: (resolved: ResolvedTheme) => void) {
	const mql = window.matchMedia('(prefers-color-scheme: dark)')
	const handler = (e: { matches: boolean }) => onChange(e.matches ? 'dark' : 'light')
	mql.addEventListener('change', handler)
	return () => mql.removeEventListener('change', handler)
}

export const useThemeStore = create<ThemeState>((set) => ({
	mode: 'light',
	resolved: 'light',

	setMode: (mode) => {
		// Clean up previous system listener
		mediaCleanup?.()
		mediaCleanup = null

		let resolved: ResolvedTheme
		if (mode === 'system') {
			resolved = resolveSystem()
			mediaCleanup = listenSystem((r) => {
				set({ resolved: r })
				applyTheme(r)
			})
		} else {
			resolved = mode
		}

		localStorage.setItem(STORAGE_KEY, mode)
		applyTheme(resolved)
		set({ mode, resolved })
	},

	hydrate: () => {
		const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
		if (stored) {
			useThemeStore.getState().setMode(stored)
		}
	},
}))
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run core/__tests__/themeStore.test.ts`
Expected: all 7 tests PASS

**Step 5: Commit**

```bash
git add core/themeStore.ts core/__tests__/themeStore.test.ts
git commit -m "feat: add theme store with light/dark/system modes"
```

---

### Task 2: Update Layout Inline Script

**Files:**
- Modify: `app/layout.tsx:40` (the inline script string)

The current script only handles literal `'light'`/`'dark'` values. Update it to also resolve `'system'` by checking `matchMedia`.

**Step 1: Update the inline script**

Replace line 40:
```js
`(function(){var t=localStorage.getItem('domus-theme')||'light';document.documentElement.setAttribute('data-theme',t)})()`
```

With:
```js
`(function(){var t=localStorage.getItem('domus-theme')||'light';if(t==='system'){t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})()`
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: clean build, no errors

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "fix: layout script handles 'system' theme mode"
```

---

### Task 3: Settings App Definition + Component

**Files:**
- Create: `apps/settings/SettingsApp.tsx`
- Create: `apps/settings/index.ts`
- Test: `apps/__tests__/settings.test.tsx`

**Step 1: Write the failing tests**

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsApp } from '@/apps/settings'
import { useThemeStore } from '@/core/themeStore'

describe('Settings app definition', () => {
	it('has correct type, name, and source', () => {
		expect(settingsApp.type).toBe('settings')
		expect(settingsApp.name).toBe('Settings')
		expect(settingsApp.source).toBe('built-in')
	})

	it('has correct default presentation and size', () => {
		expect(settingsApp.defaultPresentation).toBe('window')
		expect(settingsApp.defaultSize).toEqual({ width: 280, height: 200 })
	})

	it('is a singleton', () => {
		expect(settingsApp.maxInstances).toBe(1)
	})
})

describe('SettingsApp component', () => {
	beforeEach(() => {
		localStorage.clear()
		document.documentElement.setAttribute('data-theme', 'light')
		useThemeStore.setState({ mode: 'light', resolved: 'light' })
	})

	afterEach(() => {
		cleanup()
		vi.restoreAllMocks()
	})

	it('renders three theme options', () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		expect(screen.getByRole('button', { name: 'Light' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'Dark' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'System' })).toBeDefined()
	})

	it('highlights the active mode', () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		const lightBtn = screen.getByRole('button', { name: 'Light' })
		expect(lightBtn.getAttribute('data-variant')).toBe('pill-active')
	})

	it('clicking Dark calls setMode and updates highlight', async () => {
		const Component = settingsApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		const user = userEvent.setup()

		await user.click(screen.getByRole('button', { name: 'Dark' }))
		expect(useThemeStore.getState().mode).toBe('dark')
	})
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run apps/__tests__/settings.test.tsx`
Expected: FAIL — module not found

**Step 3: Write SettingsApp component**

`apps/settings/SettingsApp.tsx`:
```tsx
'use client'

import type { AppProps } from '@/apps/_types'
import { type ThemeMode, useThemeStore } from '@/core/themeStore'
import { Button } from '@/core/ui/button'

const OPTIONS: { value: ThemeMode; label: string }[] = [
	{ value: 'light', label: 'Light' },
	{ value: 'dark', label: 'Dark' },
	{ value: 'system', label: 'System' },
]

export default function SettingsApp({ entityId: _entityId }: AppProps) {
	const mode = useThemeStore((s) => s.mode)
	const setMode = useThemeStore((s) => s.setMode)

	return (
		<div className="flex flex-col gap-3 p-4">
			<span className="text-body-sm font-medium text-on-surface-muted">Appearance</span>
			<div className="flex gap-1">
				{OPTIONS.map((opt) => (
					<Button
						key={opt.value}
						variant={mode === opt.value ? 'pill-active' : 'pill-secondary'}
						size="pill"
						onClick={() => setMode(opt.value)}
					>
						{opt.label}
					</Button>
				))}
			</div>
		</div>
	)
}
```

**Step 4: Write app definition**

`apps/settings/index.ts`:
```ts
import { Settings } from 'lucide-react'
import type { BuiltInApp } from '@/apps/_types'
import SettingsApp from '@/apps/settings/SettingsApp'

export const settingsApp: BuiltInApp = {
	source: 'built-in',
	type: 'settings',
	name: 'Settings',
	icon: Settings,
	component: SettingsApp,
	defaultPresentation: 'window',
	defaultSize: { width: 280, height: 200 },
	maxInstances: 1,
	reduce: (state) => state,
	summarize: () => 'App settings',
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest run apps/__tests__/settings.test.tsx`
Expected: all 6 tests PASS

**Step 6: Commit**

```bash
git add apps/settings/SettingsApp.tsx apps/settings/index.ts apps/__tests__/settings.test.tsx
git commit -m "feat: add settings app with theme toggle"
```

---

### Task 4: Register Settings App in Registry

**Files:**
- Modify: `apps/_registry.ts`
- Modify: `apps/__tests__/_registry.test.ts`

**Step 1: Update the registry test**

Add to existing tests in `apps/__tests__/_registry.test.ts`:

```ts
it('getAppType returns settings definition', () => {
	const app = getAppType('settings')
	expect(app).toBeDefined()
	expect(app!.type).toBe('settings')
	expect(app!.name).toBe('Settings')
})
```

Update `getDockApps returns both apps` → `getDockApps returns all apps`:
- Change `expect(apps.length).toBe(2)` → `expect(apps.length).toBe(3)`
- Add `expect(types).toContain('settings')`

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run apps/__tests__/_registry.test.ts`
Expected: FAIL — settings not in registry

**Step 3: Update registry**

Add to `apps/_registry.ts`:
- Import: `import { settingsApp } from '@/apps/settings'`
- Add entry: `[settingsApp.type]: settingsApp,`

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run apps/__tests__/_registry.test.ts`
Expected: all 6 tests PASS

**Step 5: Commit**

```bash
git add apps/_registry.ts apps/__tests__/_registry.test.ts
git commit -m "feat: register settings app in dock"
```

---

### Task 5: Final Verification

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: all tests pass

**Step 2: Run build**

Run: `pnpm build`
Expected: clean build

**Step 3: Dark mode audit**

Run grep to confirm no remaining issues:
- `grep -r "data-theme" app/layout.tsx` — should show both inline script and html attribute
- Verify `tokens.css` has all tokens in both `:root` and `[data-theme="dark"]`

**Step 4: Update TASKS.md**

- Mark "Dark mode audit" as complete in Design System Polish section
- Add "Settings app with theme toggle" to Completed section

**Step 5: Commit**

```bash
git add docs/TASKS.md
git commit -m "docs: mark dark mode and settings app tasks complete"
```
