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
