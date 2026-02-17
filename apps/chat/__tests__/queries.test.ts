import { describe, expect, it, vi } from 'vitest'
import {
	createGroup,
	fetchGroups,
	fetchMessages,
	joinGroup,
	sendMessage,
	updateLastRead,
} from '@/apps/chat/queries'

describe('fetchGroups', () => {
	it('queries chat_members then chat_groups for current user', async () => {
		const memberData = [{ group_id: 'g1' }, { group_id: 'g2' }]
		const groupData = [
			{
				id: 'g1',
				name: 'General',
				avatar_url: null,
				invite_code: 'abc',
				created_by: 'u1',
				created_at: '2026-01-01',
			},
		]
		const chain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			in: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
		}
		let callCount = 0
		chain.select.mockImplementation(() => {
			callCount++
			return chain
		})
		chain.eq.mockImplementation(() => {
			if (callCount === 1) return { data: memberData, error: null }
			return chain
		})
		chain.order.mockImplementation(() => ({ data: groupData, error: null }))
		chain.in.mockReturnValue(chain)

		const sb = {
			from: vi.fn().mockReturnValue(chain),
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
		}

		const result = await fetchGroups(sb as never)
		expect(result).toEqual(groupData)
		expect(sb.from).toHaveBeenCalledWith('chat_members')
		expect(sb.from).toHaveBeenCalledWith('chat_groups')
	})

	it('returns empty array when user has no groups', async () => {
		const chain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnValue({ data: [], error: null }),
		}
		const sb = {
			from: vi.fn().mockReturnValue(chain),
			auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
		}

		const result = await fetchGroups(sb as never)
		expect(result).toEqual([])
	})
})

describe('fetchMessages', () => {
	it('fetches messages for a group ordered by created_at', async () => {
		const messages = [
			{
				id: 'm1',
				group_id: 'g1',
				user_id: 'u1',
				content: 'Hello',
				media_url: null,
				media_type: null,
				created_at: '2026-01-01T00:00:00Z',
			},
		]
		const chain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			lt: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnValue({ data: messages, error: null }),
		}
		const sb = { from: vi.fn().mockReturnValue(chain) }

		const result = await fetchMessages(sb as never, 'g1')
		expect(result).toEqual(messages.map((m) => ({ ...m, status: 'sent' })))
		expect(sb.from).toHaveBeenCalledWith('chat_messages')
	})

	it('supports cursor-based pagination with before param', async () => {
		const chain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			lt: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnValue({ data: [], error: null }),
		}
		const sb = { from: vi.fn().mockReturnValue(chain) }

		await fetchMessages(sb as never, 'g1', '2026-01-01T00:00:00Z')
		expect(chain.lt).toHaveBeenCalledWith('created_at', '2026-01-01T00:00:00Z')
	})
})

describe('sendMessage', () => {
	it('inserts a message and returns it', async () => {
		const inserted = {
			id: 'm1',
			group_id: 'g1',
			user_id: 'u1',
			content: 'Hi',
			media_url: null,
			media_type: null,
			created_at: '2026-01-01T00:00:00Z',
		}
		const chain = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockReturnValue({ data: inserted, error: null }),
		}
		const sb = { from: vi.fn().mockReturnValue(chain) }

		const result = await sendMessage(sb as never, {
			group_id: 'g1',
			user_id: 'u1',
			content: 'Hi',
		})
		expect(result).toEqual({ ...inserted, status: 'sent' })
		expect(sb.from).toHaveBeenCalledWith('chat_messages')
	})

	it('includes media fields when provided', async () => {
		const inserted = {
			id: 'm2',
			group_id: 'g1',
			user_id: 'u1',
			content: 'Photo',
			media_url: 'https://example.com/img.png',
			media_type: 'image/png',
			created_at: '2026-01-01T00:00:00Z',
		}
		const chain = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockReturnValue({ data: inserted, error: null }),
		}
		const sb = { from: vi.fn().mockReturnValue(chain) }

		const result = await sendMessage(sb as never, {
			group_id: 'g1',
			user_id: 'u1',
			content: 'Photo',
			media_url: 'https://example.com/img.png',
			media_type: 'image/png',
		})
		expect(result.media_url).toBe('https://example.com/img.png')
	})

	it('throws on insert error', async () => {
		const chain = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockReturnValue({ data: null, error: { message: 'RLS denied' } }),
		}
		const sb = { from: vi.fn().mockReturnValue(chain) }

		await expect(
			sendMessage(sb as never, { group_id: 'g1', user_id: 'u1', content: 'Hi' }),
		).rejects.toThrow('RLS denied')
	})
})

describe('createGroup', () => {
	it('inserts group and adds creator as owner member', async () => {
		const group = {
			id: 'g1',
			name: 'New Group',
			avatar_url: null,
			invite_code: 'xyz',
			created_by: 'u1',
			created_at: '2026-01-01T00:00:00Z',
		}
		const sb = {
			rpc: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: group, error: null }),
			}),
		}

		const result = await createGroup(sb as never, 'New Group')
		expect(result).toEqual(group)
		expect(sb.rpc).toHaveBeenCalledWith('create_chat_group', { p_name: 'New Group' })
	})
})

describe('joinGroup', () => {
	it('calls RPC join_group_via_invite and returns group', async () => {
		const group = { id: 'g1', name: 'General' }
		const sb = {
			rpc: vi.fn().mockResolvedValue({ data: group, error: null }),
		}

		const result = await joinGroup(sb as never, 'abc123')
		expect(result).toEqual(group)
		expect(sb.rpc).toHaveBeenCalledWith('join_group_via_invite', {
			p_invite_code: 'abc123',
		})
	})

	it('throws when invite code is invalid', async () => {
		const sb = {
			rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'Invalid invite code' } }),
		}

		await expect(joinGroup(sb as never, 'bad-code')).rejects.toThrow('Invalid invite code')
	})
})

describe('updateLastRead', () => {
	it('updates last_read_at for user in group', async () => {
		const chain = {
			update: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
		}
		// Final .eq() returns the result
		let eqCallCount = 0
		chain.eq.mockImplementation(() => {
			eqCallCount++
			if (eqCallCount >= 2) return { error: null }
			return chain
		})
		const sb = { from: vi.fn().mockReturnValue(chain) }

		await updateLastRead(sb as never, 'g1', 'u1')
		expect(sb.from).toHaveBeenCalledWith('chat_members')
		expect(chain.update).toHaveBeenCalled()
		expect(chain.eq).toHaveBeenCalledWith('group_id', 'g1')
		expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
	})
})
