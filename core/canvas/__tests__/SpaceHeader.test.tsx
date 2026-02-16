import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockSignOut = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => ({
		auth: { signOut: mockSignOut },
	}),
}))

import SpaceHeader from '@/core/canvas/SpaceHeader'
import { useSheetStore } from '@/core/sheetStore'

describe('SpaceHeader', () => {
	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
		vi.clearAllMocks()
	})

	it('renders the space name', () => {
		render(<SpaceHeader spaceName="Work" />)
		expect(screen.getByText('Work')).toBeDefined()
	})

	it('has data-testid space-header', () => {
		render(<SpaceHeader spaceName="Work" />)
		expect(screen.getByTestId('space-header')).toBeDefined()
	})

	it('renders switch pill button', () => {
		render(<SpaceHeader spaceName="Work" />)
		expect(screen.getByRole('button', { name: 'Switch space' })).toBeDefined()
	})

	it('calls onSwitchSpace when swap button is clicked', () => {
		const onSwitchSpace = vi.fn()
		render(<SpaceHeader spaceName="Work" onSwitchSpace={onSwitchSpace} />)
		fireEvent.click(screen.getByRole('button', { name: 'Switch space' }))
		expect(onSwitchSpace).toHaveBeenCalledOnce()
	})

	describe('guest state (no user)', () => {
		it('renders sign-in button that opens login sheet', () => {
			render(<SpaceHeader spaceName="Work" />)
			const signInButton = screen.getByRole('button', { name: 'Sign in' })
			expect(signInButton).toBeDefined()
			fireEvent.click(signInButton)
			const state = useSheetStore.getState()
			expect(state.isOpen).toBe(true)
			expect(state.contentType).toBe('login')
		})

		it('does not render user avatar when no user', () => {
			render(<SpaceHeader spaceName="Work" />)
			expect(screen.queryByTestId('user-avatar')).toBeNull()
		})
	})

	describe('authenticated state (user provided)', () => {
		const user = { name: 'Jane Doe', avatarUrl: 'https://example.com/avatar.jpg' }

		it('renders user avatar instead of sign-in button', () => {
			render(<SpaceHeader spaceName="Work" user={user} />)
			expect(screen.getByTestId('user-avatar')).toBeDefined()
			expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()
		})

		it('renders avatar image with user avatar URL', () => {
			render(<SpaceHeader spaceName="Work" user={user} />)
			const img = screen.getByTestId('user-avatar').querySelector('img')
			expect(img).toBeDefined()
			expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg')
		})

		it('renders initials fallback when no avatar URL', () => {
			render(<SpaceHeader spaceName="Work" user={{ name: 'Jane Doe' }} />)
			const avatar = screen.getByTestId('user-avatar')
			expect(avatar.textContent).toContain('JD')
		})

		it('opens profile dropdown on avatar click', () => {
			render(<SpaceHeader spaceName="Work" user={user} />)
			fireEvent.click(screen.getByTestId('user-avatar'))
			expect(screen.getByTestId('profile-dropdown')).toBeDefined()
			expect(screen.getByText('Jane Doe')).toBeDefined()
		})

		it('calls supabase signOut and reloads page on sign-out click', async () => {
			const reloadMock = vi.fn()
			Object.defineProperty(window, 'location', {
				writable: true,
				value: { ...window.location, reload: reloadMock },
			})

			render(<SpaceHeader spaceName="Work" user={user} />)
			fireEvent.click(screen.getByTestId('user-avatar'))
			fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

			await vi.waitFor(() => {
				expect(mockSignOut).toHaveBeenCalledOnce()
				expect(reloadMock).toHaveBeenCalledOnce()
			})
		})
	})
})
