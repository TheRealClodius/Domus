import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AgentChat from '@/core/chat/AgentChat'
import { useConversationStore } from '@/core/chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'

vi.mock('@/core/chat/useAgentStream', () => ({
	sendMessage: vi.fn().mockRejectedValue(new Error('no server')),
	parseSSEEvent: vi.fn(),
	serializeContextItems: vi.fn().mockResolvedValue([]),
}))

describe('AgentChat', () => {
	afterEach(() => {
		cleanup()
		useConversationStore.getState().reset()
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			selectedIds: new Set<string>(),
		})
		useSheetStore.setState({
			isOpen: false,
			entityId: null,
			contentType: null,
			sectionId: null,
		})
		vi.restoreAllMocks()
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

	it('new image button pre-fills the image generation prompt', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New image' }))
		expect(screen.getByPlaceholderText('Message...')).toHaveValue('Generate an image of ')
	})

	it('new note button creates a note entity and opens its sheet', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New note' }))

		const notes = Object.values(useEntityStore.getState().entities).filter((e) => e.type === 'note')
		expect(notes).toHaveLength(1)
		expect(useEntityStore.getState().focusedId).toBe(notes[0].id)

		const sheet = useSheetStore.getState()
		expect(sheet.isOpen).toBe(true)
		expect(sheet.entityId).toBe(notes[0].id)
		expect(sheet.contentType).toBe('entity')
	})

	it('new folder button creates an empty folder when fewer than two entities are selected', () => {
		useEntityStore.setState({
			entities: {
				'e-1': {
					id: 'e-1',
					space_id: 'space-1',
					user_id: 'user-1',
					type: 'note',
					presentation: 'card',
					position: { x: 20, y: 20, locked: false },
					size: { width: 232, height: 300 },
					z_index: 5,
					content: '',
					state: {},
					summary: '',
					created_by: 'user',
					archived: false,
					created_at: '2026-01-01T00:00:00Z',
					updated_at: '2026-01-01T00:00:00Z',
				},
			},
			selectedIds: new Set(['e-1']),
		})

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		const folders = Object.values(useEntityStore.getState().entities).filter(
			(e) => e.type === 'folder' && !e.archived,
		)
		expect(folders).toHaveLength(1)
		expect(folders[0].state).toMatchObject({ child_ids: [] })
		expect(folders[0].position.locked).toBe(true)
		expect(folders[0].z_index).toBe(6)
	})

	it('new folder button gathers selected entities when two or more are selected', () => {
		useEntityStore.setState({
			entities: {
				'a': {
					id: 'a',
					space_id: 'space-1',
					user_id: 'user-1',
					type: 'note',
					presentation: 'card',
					position: { x: 20, y: 20, locked: false },
					size: { width: 232, height: 300 },
					z_index: 1,
					content: '',
					state: {},
					summary: '',
					created_by: 'user',
					archived: false,
					created_at: '2026-01-01T00:00:00Z',
					updated_at: '2026-01-01T00:00:00Z',
				},
				'b': {
					id: 'b',
					space_id: 'space-1',
					user_id: 'user-1',
					type: 'note',
					presentation: 'card',
					position: { x: 120, y: 40, locked: false },
					size: { width: 232, height: 300 },
					z_index: 2,
					content: '',
					state: {},
					summary: '',
					created_by: 'user',
					archived: false,
					created_at: '2026-01-01T00:00:00Z',
					updated_at: '2026-01-01T00:00:00Z',
				},
			},
			selectedIds: new Set(['a', 'b']),
		})
		const gatherSpy = vi.spyOn(useEntityStore.getState(), 'gatherEntities')
		const clearSpy = vi.spyOn(useEntityStore.getState(), 'clearSelection')

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		expect(gatherSpy).toHaveBeenCalledWith(['a', 'b'], expect.any(Object))
		expect(clearSpy).toHaveBeenCalledTimes(1)
	})
})
