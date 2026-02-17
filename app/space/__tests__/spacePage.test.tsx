import { describe, expect, it, vi } from 'vitest'

const mockRedirect = vi.fn((): never => {
	throw new Error('NEXT_REDIRECT')
})

const mockNotFound = vi.fn((): never => {
	throw new Error('NEXT_NOT_FOUND')
})

vi.mock('next/navigation', () => ({
	redirect: (...args: unknown[]) => mockRedirect(...args),
	notFound: () => mockNotFound(),
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

// Suppress React rendering — we only test server logic
vi.mock('@/core/canvas/CanvasShell', () => ({
	default: (props: Record<string, unknown>) => ({ type: 'CanvasShell', props }),
}))
vi.mock('@/core/canvas/SpaceHydrator', () => ({
	default: (props: Record<string, unknown>) => ({ type: 'SpaceHydrator', props }),
}))
vi.mock('@/core/canvas/SpaceRenderer', () => ({
	default: (props: Record<string, unknown>) => ({ type: 'SpaceRenderer', props }),
}))
vi.mock('@/core/chat/AgentChat', () => ({
	default: (props: Record<string, unknown>) => ({ type: 'AgentChat', props }),
}))
vi.mock('@/core/sheet/SpaceSheet', () => ({
	default: (props: Record<string, unknown>) => ({ type: 'SpaceSheet', props }),
}))

const params = Promise.resolve({ id: 'space-abc' })

describe('Space page authorization', () => {
	it('redirects to / when no user session exists', async () => {
		mockGetUser.mockResolvedValue({ data: { user: null } })

		const Page = (await import('@/app/space/[id]/page')).default
		await expect(Page({ params })).rejects.toThrow('NEXT_REDIRECT')
		expect(mockRedirect).toHaveBeenCalledWith('/')
	})

	it('returns notFound when space query returns null (RLS blocks it)', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: { id: 'user-123', user_metadata: {}, is_anonymous: false } },
		})

		mockFrom.mockImplementation((table: string) => {
			if (table === 'spaces') {
				return createQueryMock({ data: null, error: { code: 'PGRST116' } })()
			}
			return createQueryMock({ data: [], error: null })()
		})

		const Page = (await import('@/app/space/[id]/page')).default
		await expect(Page({ params })).rejects.toThrow('NEXT_NOT_FOUND')
		expect(mockNotFound).toHaveBeenCalled()
	})

	it('renders normally when space exists', async () => {
		mockGetUser.mockResolvedValue({
			data: {
				user: {
					id: 'user-123',
					user_metadata: { full_name: 'Alice', avatar_url: 'https://img.test/a.png' },
					is_anonymous: false,
				},
			},
		})

		mockFrom.mockImplementation((table: string) => {
			if (table === 'spaces') {
				return createQueryMock({ data: { name: 'Test Space' }, error: null })()
			}
			return createQueryMock({ data: [{ id: 'ent-1' }], error: null })()
		})

		const Page = (await import('@/app/space/[id]/page')).default
		const result = await Page({ params })
		expect(result).toBeDefined()
		expect(result.props.className).toBe('h-screen bg-surface')
	})
})
