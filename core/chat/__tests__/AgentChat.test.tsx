import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AgentChat from '@/core/chat/AgentChat'
import { useConversationStore } from '@/core/chat/conversationStore'
import { markGathering } from '@/core/canvas/SpaceRenderer'
import { createEntityFromApp } from '@/core/canvas/createEntityFromApp'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import type { Entity } from '@/lib/types'

vi.mock('@/core/chat/useAgentStream', () => ({
	sendMessage: vi.fn().mockRejectedValue(new Error('no server')),
	parseSSEEvent: vi.fn(),
	serializeContextItems: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/core/canvas/createEntityFromApp', () => ({
	createEntityFromApp: vi.fn(),
}))

vi.mock('@/core/canvas/SpaceRenderer', () => ({
	markGathering: vi.fn(),
}))

function makeEntity(id: string): Entity {
	return {
		id,
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'card',
		position: { x: 100, y: 200, locked: true },
		size: { width: 320, height: 220 },
		z_index: 1,
		content: '',
		state: {},
		summary: '',
		created_by: 'user',
		archived: false,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
	}
}

describe('AgentChat', () => {
	afterEach(() => {
		cleanup()
		useConversationStore.getState().reset()
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			_pendingMap: {},
			agentActiveIds: new Set<string>(),
			selectedIds: new Set<string>(),
		})
		useSheetStore.setState({
			isOpen: false,
			entityId: null,
			contentType: null,
			sectionId: null,
			agentStreaming: false,
			streamPaused: false,
			agentCursorPosition: null,
			_onCloseComplete: null,
		})
		vi.clearAllMocks()
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

	it('clicking "New image" seeds the image prompt text', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)

		fireEvent.click(screen.getByRole('button', { name: 'New image' }))

		expect(screen.getByPlaceholderText('Message...')).toHaveValue('Generate an image of ')
	})

	it('clicking "New note" creates and focuses a note and opens sheet', () => {
		const now = new Date().toISOString()
		const created = {
			id: 'note-created',
			space_id: 'space-1',
			user_id: 'user-1',
			type: 'note',
			presentation: 'window',
			position: { x: 120, y: 140, locked: true },
			size: { width: 400, height: 300 },
			z_index: 2,
			content: '',
			state: {},
			summary: 'New note',
			created_by: 'user',
			archived: false,
			created_at: now,
			updated_at: now,
		} satisfies Entity
		vi.mocked(createEntityFromApp).mockReturnValue(created)

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New note' }))

		const store = useEntityStore.getState()
		expect(vi.mocked(createEntityFromApp)).toHaveBeenCalledOnce()
		expect(store.entities['note-created']).toEqual(created)
		expect(store.focusedId).toBe('note-created')

		const sheet = useSheetStore.getState()
		expect(sheet.isOpen).toBe(true)
		expect(sheet.entityId).toBe('note-created')
		expect(sheet.contentType).toBe('entity')
	})

	it('clicking "New folder" with no multi-selection creates a new folder entity', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		const folders = Object.values(useEntityStore.getState().entities).filter(
			(e) => e.type === 'folder' && e.presentation === 'folder',
		)
		expect(folders).toHaveLength(1)
		expect(folders[0].state.child_ids).toEqual([])
		expect(folders[0].space_id).toBe('space-1')
		expect(folders[0].user_id).toBe('user-1')
	})

	it('clicking "New folder" with >=2 selections gathers selected entities', () => {
		useEntityStore.setState({
			entities: {
				a: makeEntity('a'),
				b: makeEntity('b'),
			},
			selectedIds: new Set(['a', 'b']),
		})
		const gatherSpy = vi.spyOn(useEntityStore.getState(), 'gatherEntities')
		const clearSpy = vi.spyOn(useEntityStore.getState(), 'clearSelection')

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		expect(markGathering).toHaveBeenCalledWith(['a', 'b'])
		expect(gatherSpy).toHaveBeenCalledTimes(1)
		expect(gatherSpy.mock.calls[0][0]).toEqual(['a', 'b'])
		expect(clearSpy).toHaveBeenCalledTimes(1)
	})
})
