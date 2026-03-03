import { describe, expect, it, vi } from 'vitest'

const mockRedirect = vi.fn((): never => {
	throw new Error('NEXT_REDIRECT')
})

vi.mock('next/navigation', () => ({
	redirect: (...args: unknown[]) => mockRedirect(...args),
}))

vi.mock('@/core/auth/GoogleSignInButton', () => ({
	default: () => null,
}))

vi.mock('@/app/api/space/_createSpace', () => ({
	createSpaceForUser: vi.fn().mockResolvedValue('new-space-id'),
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

describe('Home page', () => {
	it('renders landing page when no user session exists', async () => {
		mockGetUser.mockResolvedValue({ data: { user: null } })

		const Page = (await import('@/app/page')).default
		const result = await Page()
		expect(result.props.className).toContain('bg-surface')
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

	it('updates active_space_id and redirects to first existing space', async () => {
		mockGetUser.mockResolvedValue({ data: { user: { id: 'user-789' } } })

		let callCount = 0
		mockFrom.mockImplementation(() => {
			callCount++
			if (callCount === 1)
				return createQueryMock({ data: { active_space_id: null }, error: null })()
			if (callCount === 2) return createQueryMock({ data: { id: 'first-space-id' }, error: null })()
			// users update — active_space_id write
			return createQueryMock({ data: null, error: null })()
		})

		const Page = (await import('@/app/page')).default
		await expect(Page()).rejects.toThrow('NEXT_REDIRECT')
		expect(mockRedirect).toHaveBeenCalledWith('/space/first-space-id')
	})

	it('creates space server-side and redirects when user has no spaces', async () => {
		mockGetUser.mockResolvedValue({ data: { user: { id: 'user-456', user_metadata: {} } } })

		let callCount = 0
		mockFrom.mockImplementation(() => {
			callCount++
			if (callCount === 1) {
				// users query — no active_space_id
				return createQueryMock({ data: { active_space_id: null }, error: null })()
			}
			// spaces query — no existing space
			return createQueryMock({ data: null, error: { code: 'PGRST116' } })()
		})

		const { createSpaceForUser } = await import('@/app/api/space/_createSpace')
		const Page = (await import('@/app/page')).default
		await expect(Page()).rejects.toThrow('NEXT_REDIRECT')
		expect(createSpaceForUser).toHaveBeenCalled()
		expect(mockRedirect).toHaveBeenCalledWith('/space/new-space-id')
	})
})
