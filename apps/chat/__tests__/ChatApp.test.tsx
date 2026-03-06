import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatStore } from '@/apps/chat/chatStore'
import type { ChatGroup, ChatMessage } from '@/apps/chat/types'

// Mock Supabase client
const mockGetUser = vi.fn()
const mockSupabase = {
	auth: { getUser: mockGetUser },
	from: vi.fn().mockReturnValue({
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		lt: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		single: vi.fn().mockReturnValue({ data: null, error: null }),
	}),
	channel: vi.fn().mockReturnValue({
		on: vi.fn().mockReturnThis(),
		subscribe: vi.fn().mockReturnThis(),
		send: vi.fn().mockResolvedValue('ok'),
		unsubscribe: vi.fn(),
	}),
	removeChannel: vi.fn(),
}

vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => mockSupabase,
}))

// Mock sheetStore to avoid side effects
vi.mock('@/core/sheetStore', () => ({
	useSheetStore: {
		getState: () => ({ open: vi.fn() }),
	},
}))

const { default: ChatApp } = await import('@/apps/chat/ChatApp')

function makeGroup(overrides: Partial<ChatGroup> = {}): ChatGroup {
	return {
		id: 'g1',
		name: 'General',
		avatar_url: null,
		invite_code: 'abc123',
		created_by: 'u1',
		created_at: '2026-01-01T00:00:00Z',
		...overrides,
	}
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

describe('ChatApp — unauthenticated', () => {
	it('shows auth gate when user is anonymous', async () => {
		mockGetUser.mockResolvedValue({
			data: { user: { id: 'u1', is_anonymous: true } },
		})

		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByText(/sign in to chat/i)).toBeDefined()
		})
	})

	it('shows auth gate when no user', async () => {
		mockGetUser.mockResolvedValue({ data: { user: null } })

		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByText(/sign in to chat/i)).toBeDefined()
		})
	})
})

describe('ChatApp — authenticated', () => {
	beforeEach(() => {
		mockGetUser.mockResolvedValue({
			data: { user: { id: 'u1', is_anonymous: false } },
		})
	})

	it('renders message area after auth check', async () => {
		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			// Should show the empty state or message area
			expect(screen.queryByText(/sign in to chat/i)).toBeNull()
		})
	})

	it('shows empty state when no group is selected', async () => {
		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByText(/no conversations yet/i)).toBeDefined()
		})
	})

	it('renders chat input when a group is active', async () => {
		// Pre-populate store with a group
		useChatStore.getState().setGroups([makeGroup()])
		useChatStore.getState().setActiveGroup('g1')
		useChatStore.getState().setMessages('g1', [])

		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByRole('textbox')).toBeDefined()
		})
	})

	it('renders messages from the active group', async () => {
		const msg: ChatMessage = {
			id: 'm1',
			group_id: 'g1',
			user_id: 'u2',
			content: 'Hey there!',
			media_url: null,
			media_type: null,
			created_at: '2026-01-01T00:00:00Z',
			status: 'sent',
		}
		useChatStore.getState().setGroups([makeGroup()])
		useChatStore.getState().setActiveGroup('g1')
		useChatStore.getState().setMessages('g1', [msg])

		render(<ChatApp {...defaultProps} />)

		await waitFor(() => {
			expect(screen.getByText('Hey there!')).toBeDefined()
		})
	})
})
