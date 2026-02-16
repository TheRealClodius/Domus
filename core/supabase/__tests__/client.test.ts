import { beforeEach, describe, expect, it, vi } from 'vitest'

const fakeClient = { auth: {} }

vi.mock('@supabase/ssr', () => ({
	createBrowserClient: vi.fn(() => fakeClient),
}))

describe('getSupabaseBrowserClient', () => {
	beforeEach(() => {
		vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
		vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
		vi.resetModules()
	})

	it('returns a Supabase client object with an auth property', async () => {
		const { getSupabaseBrowserClient } = await import('@/core/supabase/client')
		const client = getSupabaseBrowserClient()

		expect(client).toBeDefined()
		expect(client).toHaveProperty('auth')
	})

	it('is a singleton — calling twice returns the same reference', async () => {
		const { getSupabaseBrowserClient } = await import('@/core/supabase/client')
		const first = getSupabaseBrowserClient()
		const second = getSupabaseBrowserClient()

		expect(first).toBe(second)
	})
})
