import { describe, expect, it, vi } from 'vitest'

const mockRedirect = vi.fn((): never => {
	throw new Error('NEXT_REDIRECT')
})

vi.mock('next/navigation', () => ({
	redirect: (...args: unknown[]) => mockRedirect(...args),
}))

// Chainable Supabase query builder mock
function createQueryMock(result: { data: unknown; error: unknown }) {
	const chain: Record<string, unknown> = {}
	const handler = () =>
		new Proxy(chain, {
			get(_target, prop) {
				if (prop === 'then') {
					return (resolve: (v: unknown) => void) => resolve(result)
				}
				return handler
			},
		})
	return handler
}

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: () =>
		Promise.resolve({
			auth: { getUser: mockGetUser },
			from: mockFrom,
		}),
}))

// Suppress React rendering in test — we only care about the server logic
vi.mock('@/core/auth/GuestSessionBootstrap', () => ({
	default: (props: Record<string, unknown>) => ({ type: 'GuestSessionBootstrap', props }),
}))

describe('Home page', () => {
	it('renders GuestSessionBootstrap when no user session exists', async () => {
		mockGetUser.mockResolvedValue({ data: { user: null } })

		const Page = (await import('@/app/page')).default
		const result = await Page()
		expect(result.props).toEqual({})
	})

	it('redirects to active_space_id when user has one', async () => {
		mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } })
		mockFrom.mockImplementation(() =>
			createQueryMock({ data: { active_space_id: 'space-abc' }, error: null })(),
		)

		const Page = (await import('@/app/page')).default
		await expect(Page()).rejects.toThrow('NEXT_REDIRECT')
		expect(mockRedirect).toHaveBeenCalledWith('/space/space-abc')
	})

	it('renders GuestSessionBootstrap with hasSession when user has no spaces', async () => {
		mockGetUser.mockResolvedValue({ data: { user: { id: 'user-456' } } })

		// First call: users query returns no active_space_id
		// Second call: spaces query returns no spaces
		let callCount = 0
		mockFrom.mockImplementation(() => {
			callCount++
			if (callCount === 1) {
				return createQueryMock({ data: { active_space_id: null }, error: null })()
			}
			return createQueryMock({ data: null, error: { code: 'PGRST116' } })()
		})

		const Page = (await import('@/app/page')).default
		const result = await Page()
		expect(result.props).toEqual({ hasSession: true })
	})
})
