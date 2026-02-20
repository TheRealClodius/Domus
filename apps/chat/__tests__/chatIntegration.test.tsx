import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatStore } from '@/apps/chat/chatStore'
import type { ChatGroup, ChatMessage } from '@/apps/chat/types'

// --- Mocks ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockChannel = {
	on: vi.fn().mockReturnThis(),
	subscribe: vi.fn().mockReturnThis(),
	send: vi.fn().mockResolvedValue('ok'),
	unsubscribe: vi.fn(),
}

const mockSupabase = {
	auth: { getUser: mockGetUser },
	from: mockFrom,
	channel: vi.fn().mockReturnValue(mockChannel),
	removeChannel: vi.fn(),
}

vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => mockSupabase,
}))

vi.mock('@/core/sheetStore', () => ({
	useSheetStore: {
		getState: () => ({ open: vi.fn() }),
	},
}))

const { default: ChatApp } = await import('@/apps/chat/ChatApp')

// --- Helpers ---

const testUser = { id: 'u1', is_anonymous: false }

const testGroup: ChatGroup = {
	id: 'g1',
	name: 'General',
	avatar_url: null,
	invite_code: 'abc123',
	created_by: 'u1',
	created_at: '2026-01-01T00:00:00Z',
}

const testMessages: ChatMessage[] = [
	{
		id: 'm1',
		group_id: 'g1',
		user_id: 'u2',
		content: 'Hey there!',
		media_url: null,
		media_type: null,
		created_at: '2026-02-17T10:00:00Z',
		status: 'sent',
	},
	{
		id: 'm2',
		group_id: 'g1',
		user_id: 'u1',
		content: 'Hello!',
		media_url: null,
		media_type: null,
		created_at: '2026-02-17T10:01:00Z',
		status: 'sent',
	},
]

function setupAuthenticatedUser() {
	mockGetUser.mockResolvedValue({ data: { user: testUser } })
}

function setupMembershipQuery() {
	// First from() call: chat_members → returns membership
	// Second from() call: chat_groups → returns groups
	let callIdx = 0
	mockFrom.mockImplementation((table: string) => {
		callIdx++
		if (table === 'chat_members' && callIdx <= 2) {
			return {
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						data: [{ group_id: 'g1' }],
						error: null,
					}),
				}),
			}
		}
		if (table === 'chat_groups') {
			return {
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						order: vi.fn().mockReturnValue({
							data: [testGroup],
							error: null,
						}),
					}),
				}),
			}
		}
		if (table === 'chat_messages') {
			return {
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						order: vi.fn().mockReturnValue({
							limit: vi.fn().mockReturnValue({
								data: [...testMessages].reverse(), // API returns newest first
								error: null,
							}),
						}),
					}),
				}),
			}
		}
		if (table === 'users') {
			return {
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({ data: [], error: null }),
				}),
			}
		}
		// Fallback for inserts
		return {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			single: vi.fn().mockReturnValue({ data: null, error: null }),
		}
	})
}

const defaultProps = {
	entityId: 'e1',
	state: {} as Record<string, unknown>,
	dispatch: vi.fn(),
	mode: 'window' as const,
}

beforeEach(() => {
	vi.clearAllMocks()
	useChatStore.getState().reset()
})

afterEach(() => {
	cleanup()
	useChatStore.getState().reset()
})

describe('Chat integration: full flow', () => {
	it('unauthenticated user sees sign-in prompt', async () => {
		mockGetUser.mockResolvedValue({ data: { user: null } })

		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByText(/sign in to chat/i)).toBeDefined()
		})
	})

	it('authenticated user sees group selection prompt', async () => {
		setupAuthenticatedUser()
		setupMembershipQuery()

		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByText(/select a group/i)).toBeDefined()
		})
	})

	it('authenticated user with active group sees messages', async () => {
		setupAuthenticatedUser()
		setupMembershipQuery()

		// Pre-populate store as if user already selected a group
		useChatStore.getState().setGroups([testGroup])
		useChatStore.getState().setActiveGroup('g1')
		useChatStore.getState().setMessages('g1', testMessages)

		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByText('Hey there!')).toBeDefined()
			expect(screen.getByText('Hello!')).toBeDefined()
		})
	})

	it('authenticated user can type and send a message', async () => {
		setupAuthenticatedUser()

		// Mock from() to handle both fetchMessages (select) and sendMessage (insert)
		mockFrom.mockImplementation((table: string) => {
			if (table === 'chat_members') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({ data: [{ group_id: 'g1' }], error: null }),
					}),
				}
			}
			if (table === 'chat_groups') {
				return {
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({
							order: vi.fn().mockReturnValue({ data: [testGroup], error: null }),
						}),
					}),
				}
			}
			if (table === 'chat_messages') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							order: vi.fn().mockReturnValue({
								limit: vi.fn().mockReturnValue({ data: [], error: null }),
							}),
						}),
					}),
					insert: vi.fn().mockReturnValue({
						select: vi.fn().mockReturnValue({
							single: vi.fn().mockReturnValue({
								data: {
									id: 'm-new',
									group_id: 'g1',
									user_id: 'u1',
									content: 'New message',
									media_url: null,
									media_type: null,
									created_at: '2026-02-17T10:05:00Z',
								},
								error: null,
							}),
						}),
					}),
				}
			}
			if (table === 'users') {
				return {
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({ data: [], error: null }),
					}),
				}
			}
			return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
		})

		// Pre-populate store so component renders the chat view immediately
		useChatStore.getState().setGroups([testGroup])
		useChatStore.getState().setActiveGroup('g1')
		useChatStore.getState().setMessages('g1', [])

		const user = userEvent.setup()
		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByRole('textbox')).toBeDefined()
		})

		const input = screen.getByRole('textbox')
		await user.type(input, 'New message{Enter}')

		// Optimistic message should appear immediately
		await waitFor(() => {
			expect(screen.getByText('New message')).toBeDefined()
		})
	})

	it('shows chat input for active group', async () => {
		setupAuthenticatedUser()
		setupMembershipQuery()

		useChatStore.getState().setGroups([testGroup])
		useChatStore.getState().setActiveGroup('g1')
		useChatStore.getState().setMessages('g1', [])

		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByRole('textbox')).toBeDefined()
		})
	})
})
