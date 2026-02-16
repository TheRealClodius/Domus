import { describe, expect, it, vi } from 'vitest'

const mockRedirect = vi.fn()
vi.mock('next/navigation', () => ({
	redirect: (...args: unknown[]) => {
		mockRedirect(...args)
		throw new Error('NEXT_REDIRECT')
	},
}))

describe('Home page', () => {
	it('redirects to /space/default', async () => {
		const Page = (await import('@/app/page')).default
		expect(() => Page()).toThrow('NEXT_REDIRECT')
		expect(mockRedirect).toHaveBeenCalledWith('/space/default')
	})
})
