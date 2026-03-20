import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AgentChat from '@/core/chat/AgentChat'
import { useConversationStore } from '@/core/chat/conversationStore'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import type { Entity } from '@/lib/types'

vi.mock('@/core/chat/useAgentStream', () => ({
	sendMessage: vi.fn().mockRejectedValue(new Error('no server')),
	parseSSEEvent: vi.fn(),
	serializeContextItems: vi.fn().mockResolvedValue([]),
}))

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'entity-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'card',
		position: { x: 100, y: 100, locked: true },
		size: { width: 232, height: 300 },
		z_index: 1,
		content: '',
		state: {},
		summary: '',
		created_by: 'user',
		archived: false,
		created_at: '2026-01-01T00:00:00.000Z',
		updated_at: '2026-01-01T00:00:00.000Z',
		...overrides,
	}
}

describe('AgentChat', () => {
	afterEach(() => {
		cleanup()
		useConversationStore.getState().reset()
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			selectedIds: new Set<string>(),
		})
		useSheetStore.getState().close()
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

	it('clicking New image pre-fills the generation prompt', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)

		fireEvent.click(screen.getByRole('button', { name: 'New image' }))

		expect(screen.getByPlaceholderText('Message...')).toHaveValue('Generate an image of ')
	})

	it('clicking New note creates a focused note and opens the sheet', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)

		fireEvent.click(screen.getByRole('button', { name: 'New note' }))

		const entities = Object.values(useEntityStore.getState().entities)
		expect(entities).toHaveLength(1)
		expect(entities[0].type).toBe('note')
		expect(entities[0].space_id).toBe('space-1')
		expect(entities[0].user_id).toBe('user-1')
		expect(useEntityStore.getState().focusedId).toBe(entities[0].id)

		const sheet = useSheetStore.getState()
		expect(sheet.isOpen).toBe(true)
		expect(sheet.entityId).toBe(entities[0].id)
		expect(sheet.contentType).toBe('entity')
	})

	it('clicking New folder gathers selected entities and clears selection', () => {
		vi.spyOn(crypto, 'randomUUID').mockReturnValue('folder-new')
		useEntityStore.setState({
			entities: {
				'e-1': makeEntity({ id: 'e-1', position: { x: 50, y: 40, locked: true } }),
				'e-2': makeEntity({ id: 'e-2', position: { x: 400, y: 260, locked: true } }),
			},
			selectedIds: new Set(['e-1', 'e-2']),
		})

		render(<AgentChat spaceId="space-1" userId="user-1" />)

		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		const state = useEntityStore.getState()
		const folder = state.entities['folder-new']
		expect(folder).toBeDefined()
		expect(folder.type).toBe('folder')
		expect(folder.presentation).toBe('folder')
		expect(folder.state.child_ids).toEqual(['e-1', 'e-2'])
		expect(state.selectedIds.size).toBe(0)
	})
})
