import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase before importing the component
const mockSignInWithOAuth = vi
	.fn()
	.mockResolvedValue({ data: { url: 'https://google.com/oauth' }, error: null })
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
