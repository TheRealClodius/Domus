import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatApp } from '@/apps/chat'

// Mock Supabase client so ChatApp can mount
vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => ({
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
		},
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
		}),
		channel: vi.fn().mockReturnValue({
			on: vi.fn().mockReturnThis(),
			subscribe: vi.fn().mockReturnThis(),
			send: vi.fn(),
			unsubscribe: vi.fn(),
		}),
		removeChannel: vi.fn(),
	}),
}))

vi.mock('@/core/sheetStore', () => ({
	useSheetStore: {
		getState: () => ({ open: vi.fn() }),
	},
}))

describe('Chat app definition', () => {
	it('has correct type, name, and source', () => {
		expect(chatApp.type).toBe('chat')
		expect(chatApp.name).toBe('Chat')
		expect(chatApp.source).toBe('built-in')
	})

	it('has correct default presentation and size', () => {
		expect(chatApp.defaultPresentation).toBe('window')
		expect(chatApp.defaultSize).toEqual({ width: 400, height: 500 })
	})
})

describe('ChatApp component', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders without crashing', async () => {
		const Component = chatApp.component
		render(<Component entityId="test" state={{}} dispatch={vi.fn()} />)
		// ChatApp shows auth gate for unauthenticated users
		await waitFor(() => {
			expect(screen.getByText(/sign in to chat/i)).toBeDefined()
		})
	})
})
