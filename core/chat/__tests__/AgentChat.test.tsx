import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { markGathering } from '@/core/canvas/SpaceRenderer'
import AgentChat from '@/core/chat/AgentChat'
import { useConversationStore } from '@/core/chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'

vi.mock('@/core/canvas/SpaceRenderer', () => ({
	markGathering: vi.fn(),
}))

vi.mock('@/core/chat/useAgentStream', () => ({
	sendMessage: vi.fn().mockRejectedValue(new Error('no server')),
	parseSSEEvent: vi.fn(),
	serializeContextItems: vi.fn().mockResolvedValue([]),
}))

describe('AgentChat', () => {
	afterEach(() => {
		cleanup()
		useConversationStore.getState().reset()
		useEntityStore.setState({ entities: {}, selectedIds: new Set<string>(), focusedId: null })
	})

	it('renders a textarea with placeholder "Message..."', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		const textarea = screen.getByPlaceholderText('Message...')
		expect(textarea).toBeDefined()
		expect(textarea.tagName).toBe('TEXTAREA')
	})

	it('renders a send button', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		const button = screen.getByRole('button', { name: /send/i })
		expect(button).toBeDefined()
	})

	it('textarea accepts text from user typing', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		const textarea = screen.getByPlaceholderText('Message...')
		fireEvent.change(textarea, { target: { value: 'Hello agent' } })
		expect(textarea).toHaveValue('Hello agent')
	})

	it('Enter key clears the input (sends message)', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		const textarea = screen.getByPlaceholderText('Message...')
		fireEvent.change(textarea, { target: { value: 'Hello' } })
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
		expect(textarea).toHaveValue('')
	})

	it('Shift+Enter does not clear the input', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		const textarea = screen.getByPlaceholderText('Message...')
		fireEvent.change(textarea, { target: { value: 'Hello' } })
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
		expect(textarea).toHaveValue('Hello')
	})

	it('adds a user turn to conversation store on send', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		const textarea = screen.getByPlaceholderText('Message...')
		fireEvent.change(textarea, { target: { value: 'Hello agent' } })
		fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
		const turns = useConversationStore.getState().turns
		expect(turns).toHaveLength(1)
		expect(turns[0].role).toBe('user')
		expect(turns[0].text).toBe('Hello agent')
	})

	it('renders ConversationPanel above prompt input', () => {
		useConversationStore.getState().addUserTurn('test')
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		expect(screen.getByTestId('conversation-panel')).toBeDefined()
	})

	it('clicking New image prefills image prompt text', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New image' }))
		expect(screen.getByPlaceholderText('Message...')).toHaveValue('Generate an image of ')
	})

	it('clicking New folder with fewer than 2 selections creates a folder entity', () => {
		const upsert = vi.fn()
		const randomUuidSpy = vi.spyOn(global.crypto, 'randomUUID').mockReturnValue('folder-id')

		useEntityStore.setState({
			entities: {
				'e-1': {
					id: 'e-1',
					space_id: 'space-1',
					user_id: 'user-1',
					type: 'note',
					presentation: 'card',
					position: { x: 0, y: 0, locked: false },
					size: { width: 236, height: 302 },
					z_index: 3,
					content: '',
					state: {},
					summary: 'a note',
					created_by: 'user',
					archived: false,
					created_at: '2026-01-01T00:00:00.000Z',
					updated_at: '2026-01-01T00:00:00.000Z',
				},
			},
			selectedIds: new Set(['e-1']),
			upsert,
		})

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		expect(upsert).toHaveBeenCalledOnce()
		expect(markGathering).not.toHaveBeenCalled()
		expect(upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'folder-id',
				space_id: 'space-1',
				user_id: 'user-1',
				type: 'folder',
				presentation: 'folder',
				state: { child_ids: [] },
				z_index: 4,
			}),
		)

		randomUuidSpy.mockRestore()
	})

	it('clicking New folder with 2+ selections gathers selected entities', () => {
		const gatherEntities = vi.fn()
		const clearSelection = vi.fn()
		const upsert = vi.fn()
		const markGatheringMock = vi.mocked(markGathering)

		useEntityStore.setState({
			entities: {
				'a': {
					id: 'a',
					space_id: 'space-1',
					user_id: 'user-1',
					type: 'note',
					presentation: 'card',
					position: { x: 0, y: 0, locked: false },
					size: { width: 236, height: 302 },
					z_index: 1,
					content: '',
					state: {},
					summary: 'a',
					created_by: 'user',
					archived: false,
					created_at: '2026-01-01T00:00:00.000Z',
					updated_at: '2026-01-01T00:00:00.000Z',
				},
				'b': {
					id: 'b',
					space_id: 'space-1',
					user_id: 'user-1',
					type: 'note',
					presentation: 'card',
					position: { x: 0, y: 0, locked: false },
					size: { width: 236, height: 302 },
					z_index: 2,
					content: '',
					state: {},
					summary: 'b',
					created_by: 'user',
					archived: false,
					created_at: '2026-01-01T00:00:00.000Z',
					updated_at: '2026-01-01T00:00:00.000Z',
				},
			},
			selectedIds: new Set(['a', 'b']),
			gatherEntities,
			clearSelection,
			upsert,
		})

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		expect(markGatheringMock).toHaveBeenCalledWith(['a', 'b'])
		expect(gatherEntities).toHaveBeenCalledOnce()
		expect(gatherEntities).toHaveBeenCalledWith(
			['a', 'b'],
			expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
		)
		expect(clearSelection).toHaveBeenCalledOnce()
		expect(upsert).not.toHaveBeenCalled()
	})
})
