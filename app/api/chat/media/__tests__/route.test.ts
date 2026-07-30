import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@/core/supabase/server', () => ({
	getSupabaseServerClient: vi.fn(),
}))

import { getSupabaseServerClient } from '@/core/supabase/server'
import { GET } from '../route'

type MockSupabaseOptions = {
	user?: { id: string } | null
	membership?: { group_id: string } | null
	membershipError?: { message: string } | null
	signedUrlData?: { signedUrl: string } | null
	signedUrlError?: { message: string } | null
}

function mockSupabaseClient(options: MockSupabaseOptions = {}) {
	const single = vi.fn().mockResolvedValue({
		data: options.membership ?? null,
		error: options.membershipError ?? null,
	})
	const eqByUserId = vi.fn().mockReturnValue({ single })
	const eqByGroupId = vi.fn().mockReturnValue({ eq: eqByUserId })
	const select = vi.fn().mockReturnValue({ eq: eqByGroupId })

	const createSignedUrl = vi.fn().mockResolvedValue({
		data: options.signedUrlData ?? null,
		error: options.signedUrlError ?? null,
	})
	const storageFrom = vi.fn().mockReturnValue({ createSignedUrl })

	const supabase = {
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user: options.user === undefined ? { id: 'user-1' } : options.user },
			}),
		},
		from: vi.fn().mockImplementation((table: string) => {
			if (table !== 'chat_members') {
				throw new Error(`Unexpected table: ${table}`)
			}
			return { select }
		}),
		storage: {
			from: storageFrom,
		},
	}

	;(getSupabaseServerClient as Mock).mockResolvedValue(supabase)

	return {
		supabase,
		select,
		eqByGroupId,
		eqByUserId,
		single,
		storageFrom,
		createSignedUrl,
	}
}

function makeRequest(path?: string) {
	const query = path ? `?path=${encodeURIComponent(path)}` : ''
	return new Request(`http://localhost/api/chat/media${query}`, { method: 'GET' })
}

describe('GET /api/chat/media', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when user is not authenticated', async () => {
		const { supabase } = mockSupabaseClient({ user: null })

		const res = await GET(makeRequest('user-1/chat/group-1/msg-1/file.png'))
		const json = await res.json()

		expect(res.status).toBe(401)
		expect(json.error).toBe('Unauthorized')
		expect(supabase.from).not.toHaveBeenCalled()
	})

	it('returns 400 when path parameter is missing', async () => {
		const { supabase } = mockSupabaseClient()

		const res = await GET(makeRequest())
		const json = await res.json()

		expect(res.status).toBe(400)
		expect(json.error).toBe('Missing path parameter')
		expect(supabase.from).not.toHaveBeenCalled()
	})

	it('returns 400 for invalid chat media path format', async () => {
		const { supabase } = mockSupabaseClient()

		const res = await GET(makeRequest('user-1/chat/group-1'))
		const json = await res.json()

		expect(res.status).toBe(400)
		expect(json.error).toBe('Invalid path format')
		expect(supabase.from).not.toHaveBeenCalled()
	})

	it('returns 403 when user is not a member of the chat group', async () => {
		const { storageFrom } = mockSupabaseClient({ membership: null })

		const res = await GET(makeRequest('user-1/chat/group-123/msg-1/file.png'))
		const json = await res.json()

		expect(res.status).toBe(403)
		expect(json.error).toBe('Forbidden')
		expect(storageFrom).not.toHaveBeenCalled()
	})

	it('returns 500 when signed URL creation fails', async () => {
		const { createSignedUrl } = mockSupabaseClient({
			membership: { group_id: 'group-123' },
			signedUrlData: null,
			signedUrlError: { message: 'Storage unavailable' },
		})

		const res = await GET(makeRequest('user-1/chat/group-123/msg-1/file.png'))
		const json = await res.json()

		expect(res.status).toBe(500)
		expect(json.error).toBe('Storage unavailable')
		expect(createSignedUrl).toHaveBeenCalledWith('user-1/chat/group-123/msg-1/file.png', 3600)
	})

	it('returns signed URL when user membership is valid', async () => {
		const { eqByGroupId, eqByUserId, storageFrom, createSignedUrl } = mockSupabaseClient({
			membership: { group_id: 'group-123' },
			signedUrlData: { signedUrl: 'https://signed.example/path' },
		})

		const res = await GET(makeRequest('user-1/chat/group-123/msg-1/file.png'))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json).toEqual({ url: 'https://signed.example/path' })
		expect(eqByGroupId).toHaveBeenCalledWith('group_id', 'group-123')
		expect(eqByUserId).toHaveBeenCalledWith('user_id', 'user-1')
		expect(storageFrom).toHaveBeenCalledWith('chat-media')
		expect(createSignedUrl).toHaveBeenCalledWith('user-1/chat/group-123/msg-1/file.png', 3600)
	})
})
