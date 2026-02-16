import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase before importing the component
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } })
const mockSignInWithOAuth = vi
	.fn()
	.mockResolvedValue({ data: { url: 'https://google.com/oauth' }, error: null })
const mockLinkIdentity = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => ({
		auth: {
			getUser: mockGetUser,
			signInWithOAuth: mockSignInWithOAuth,
			linkIdentity: mockLinkIdentity,
		},
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

	it('calls signInWithOAuth on click when not anonymous', async () => {
		mockGetUser.mockResolvedValue({ data: { user: { id: '123', is_anonymous: false } } })
		const userEvent = (await import('@testing-library/user-event')).default
		render(<GoogleSignInButton />)
		await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))
		expect(mockSignInWithOAuth).toHaveBeenCalledWith({
			provider: 'google',
			options: { redirectTo: expect.stringContaining('/auth/callback') },
		})
	})

	it('calls linkIdentity on click when user is anonymous', async () => {
		mockGetUser.mockResolvedValue({ data: { user: { id: '456', is_anonymous: true } } })
		const userEvent = (await import('@testing-library/user-event')).default
		render(<GoogleSignInButton />)
		await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))
		expect(mockLinkIdentity).toHaveBeenCalledWith({
			provider: 'google',
			options: { redirectTo: expect.stringContaining('/auth/callback') },
		})
		expect(mockSignInWithOAuth).not.toHaveBeenCalled()
	})

	it('falls back to signInWithOAuth when linkIdentity fails for anonymous user', async () => {
		mockGetUser.mockResolvedValue({ data: { user: { id: '789', is_anonymous: true } } })
		mockLinkIdentity.mockResolvedValue({ error: { message: 'Identity already exists' } })
		const userEvent = (await import('@testing-library/user-event')).default
		render(<GoogleSignInButton />)
		await userEvent.click(screen.getByRole('button', { name: /continue with google/i }))
		expect(mockLinkIdentity).toHaveBeenCalled()
		expect(mockSignInWithOAuth).toHaveBeenCalledWith({
			provider: 'google',
			options: { redirectTo: expect.stringContaining('/auth/callback') },
		})
	})
})
