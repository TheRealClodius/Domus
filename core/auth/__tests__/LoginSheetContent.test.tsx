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
