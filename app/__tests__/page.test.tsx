import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(() => ({
		auth: {
			getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
		},
	})),
}))

describe('Home page', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders a "Sign in with Google" button', async () => {
		const Page = (await import('@/app/page')).default
		const result = await Page()
		render(result)

		expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
	})

	it('the sign-in button is clickable (exists in the DOM)', async () => {
		const Page = (await import('@/app/page')).default
		const result = await Page()
		render(result)

		const button = screen.getByRole('button', { name: /sign in with google/i })
		expect(button).toBeDefined()
		expect(button).toBeVisible()
	})
})
