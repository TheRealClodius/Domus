# Login Sheet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a login sheet that slides up over the canvas (FullScreenSheet) with Google OAuth sign-in via a pill button.

**Architecture:** The sheetStore already supports `contentType: 'login'`. We create `GoogleSignInButton` (pill button with Google logo + OAuth call) and `LoginSheetContent` (centered layout with wordmark, tagline, button, legal text). Then wire it into `SpaceSheet` so `contentType === 'login'` renders the login content.

**Tech Stack:** React 19, Zustand (sheetStore), Supabase Auth (Google OAuth), Tailwind v4 tokens, motion/react (FullScreenSheet animation)

---

### Task 1: GoogleSignInButton component

**Files:**
- Create: `core/auth/GoogleSignInButton.tsx`
- Test: `core/auth/__tests__/GoogleSignInButton.test.tsx`

**Context:** The existing `SignInButton` (`core/auth/SignInButton.tsx`) uses `variant="default" size="lg"`. The new button uses `pill-base` variant with a wider/taller pill style and an inline Google "G" SVG. The OAuth logic is identical — call `supabase.auth.signInWithOAuth({ provider: 'google' })`.

**Step 1: Write the failing test**

```tsx
// core/auth/__tests__/GoogleSignInButton.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase before importing the component
const mockSignInWithOAuth = vi.fn().mockResolvedValue({ data: { url: 'https://google.com/oauth' }, error: null })
vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => ({
		auth: { signInWithOAuth: mockSignInWithOAuth },
	}),
}))

import GoogleSignInButton from '@/core/auth/GoogleSignInButton'

describe('GoogleSignInButton', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	it('renders with Google logo and label', () => {
		render(<GoogleSignInButton />)
		expect(screen.getByRole('button', { name: /continue with google/i })).toBeDefined()
		expect(screen.getByTestId('google-logo')).toBeDefined()
	})

	it('uses pill-base variant', () => {
		render(<GoogleSignInButton />)
		const button = screen.getByRole('button', { name: /continue with google/i })
		expect(button.dataset.variant).toBe('pill-base')
	})

	it('calls signInWithOAuth on click', async () => {
		const userEvent = (await import('@testing-library/user-event')).default
		render(<GoogleSignInButton />)
		await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))
		expect(mockSignInWithOAuth).toHaveBeenCalledWith({
			provider: 'google',
			options: { redirectTo: expect.stringContaining('/auth/callback') },
		})
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/auth/__tests__/GoogleSignInButton.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the component**

```tsx
// core/auth/GoogleSignInButton.tsx
'use client'

import { getSupabaseBrowserClient } from '@/core/supabase/client'
import { Button } from '@/core/ui/button'

function GoogleLogo() {
	return (
		<svg data-testid="google-logo" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
			<path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
			<path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
			<path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58Z" fill="#EA4335" />
		</svg>
	)
}

export default function GoogleSignInButton() {
	const handleSignIn = async () => {
		const supabase = getSupabaseBrowserClient()
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
			},
		})

		if (error) {
			console.error('OAuth sign-in error:', error.message)
			return
		}

		if (data.url) {
			window.location.href = data.url
		}
	}

	return (
		<Button
			variant="pill-base"
			size="pill"
			className="h-11 w-full max-w-sm rounded-xl px-6 text-base"
			onClick={handleSignIn}
		>
			<GoogleLogo />
			Continue with Google
		</Button>
	)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/auth/__tests__/GoogleSignInButton.test.tsx`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add core/auth/GoogleSignInButton.tsx core/auth/__tests__/GoogleSignInButton.test.tsx
git commit -m "feat: add GoogleSignInButton with pill style and OAuth"
```

---

### Task 2: LoginSheetContent component

**Files:**
- Create: `core/auth/LoginSheetContent.tsx`
- Test: `core/auth/__tests__/LoginSheetContent.test.tsx`

**Context:** This is the layout component rendered inside the FullScreenSheet when `contentType === 'login'`. It centers content vertically and contains: Domus wordmark (`font-display`), tagline, GoogleSignInButton, and legal text. SheetBody provides `pt-12 pb-12` padding and scrolling. The content should be a flex column centered both horizontally and vertically within the available height.

**Step 1: Write the failing test**

```tsx
// core/auth/__tests__/LoginSheetContent.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase (GoogleSignInButton uses it)
vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => ({
		auth: { signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }) },
	}),
}))

import LoginSheetContent from '@/core/auth/LoginSheetContent'

describe('LoginSheetContent', () => {
	afterEach(cleanup)

	it('renders Domus wordmark with display font', () => {
		render(<LoginSheetContent />)
		const wordmark = screen.getByText('Domus')
		expect(wordmark).toBeDefined()
		expect(wordmark.className).toContain('font-display')
	})

	it('renders tagline', () => {
		render(<LoginSheetContent />)
		expect(screen.getByText('Your spatial workspace.')).toBeDefined()
	})

	it('renders Google sign-in button', () => {
		render(<LoginSheetContent />)
		expect(screen.getByRole('button', { name: /continue with google/i })).toBeDefined()
	})

	it('renders legal text', () => {
		render(<LoginSheetContent />)
		expect(screen.getByText(/terms of service/i)).toBeDefined()
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/auth/__tests__/LoginSheetContent.test.tsx`
Expected: FAIL — module not found

**Step 3: Write the component**

```tsx
// core/auth/LoginSheetContent.tsx
'use client'

import GoogleSignInButton from '@/core/auth/GoogleSignInButton'

export default function LoginSheetContent() {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="flex flex-col items-center gap-8 px-6">
				<div className="flex flex-col items-center gap-2">
					<h1 className="font-display text-3xl text-on-surface">Domus</h1>
					<p className="text-body text-on-surface-muted">Your spatial workspace.</p>
				</div>

				<GoogleSignInButton />

				<p className="max-w-sm text-center text-label text-on-surface-muted">
					By continuing, you agree to the{' '}
					<span className="underline">Terms of Service</span> and{' '}
					<span className="underline">Privacy Policy</span>.
				</p>
			</div>
		</div>
	)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/auth/__tests__/LoginSheetContent.test.tsx`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add core/auth/LoginSheetContent.tsx core/auth/__tests__/LoginSheetContent.test.tsx
git commit -m "feat: add LoginSheetContent layout component"
```

---

### Task 3: Wire login content into SpaceSheet

**Files:**
- Modify: `core/sheet/SpaceSheet.tsx`
- Test: `core/sheet/__tests__/login-sheet.test.tsx`

**Context:** `SpaceSheet` currently handles `contentType === 'entity'` and falls through to "No content" for everything else. We add a branch for `contentType === 'login'` that renders `LoginSheetContent`. The existing test pattern in `core/sheet/__tests__/sheet-integration.test.tsx` shows how to open the sheet via `useSheetStore.getState().open(...)` and assert on rendered content.

**Step 1: Write the failing test**

```tsx
// core/sheet/__tests__/login-sheet.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SpaceSheet from '@/core/sheet/SpaceSheet'
import { useSheetStore } from '@/core/sheetStore'

// Mock Supabase (GoogleSignInButton uses it)
vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => ({
		auth: { signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }) },
	}),
}))

describe('Login sheet', () => {
	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

	it('renders login content when opened with login contentType', async () => {
		render(<SpaceSheet />)
		useSheetStore.getState().open(null, 'login')

		expect(await screen.findByText('Domus')).toBeDefined()
		expect(screen.getByRole('button', { name: /continue with google/i })).toBeDefined()
	})

	it('close button dismisses the login sheet', async () => {
		render(<SpaceSheet />)
		useSheetStore.getState().open(null, 'login')

		expect(await screen.findByText('Domus')).toBeDefined()
		await userEvent.click(screen.getByRole('button', { name: 'Close sheet' }))
		expect(useSheetStore.getState().isOpen).toBe(false)
	})
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run core/sheet/__tests__/login-sheet.test.tsx`
Expected: FAIL — "Domus" text not found (falls through to "No content")

**Step 3: Update SpaceSheet**

Edit `core/sheet/SpaceSheet.tsx` to add the login branch:

```tsx
// core/sheet/SpaceSheet.tsx
'use client'

import LoginSheetContent from '@/core/auth/LoginSheetContent'
import FullScreenSheet from '@/core/sheet/FullScreenSheet'
import SheetEntityContent from '@/core/sheet/SheetEntityContent'

/** Client wrapper — keeps the render function off the server/client boundary */
export default function SpaceSheet() {
	return (
		<FullScreenSheet>
			{({ entityId, contentType }) => {
				if (contentType === 'entity' && entityId) {
					return <SheetEntityContent entityId={entityId} />
				}
				if (contentType === 'login') {
					return <LoginSheetContent />
				}
				return <p className="text-on-surface-muted">No content</p>
			}}
		</FullScreenSheet>
	)
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run core/sheet/__tests__/login-sheet.test.tsx`
Expected: PASS (2 tests)

**Step 5: Run all sheet tests to verify no regressions**

Run: `npx vitest run core/sheet/__tests__/`
Expected: All existing tests pass

**Step 6: Commit**

```bash
git add core/sheet/SpaceSheet.tsx core/sheet/__tests__/login-sheet.test.tsx
git commit -m "feat: wire login content into SpaceSheet"
```
