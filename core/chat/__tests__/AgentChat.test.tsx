import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('AgentChat', () => {
	beforeEach(() => {
		useConversationStore.getState().reset()
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			selectedIds: new Set<string>(),
		})
		useSheetStore.getState().close()
	})

	afterEach(() => {
		cleanup()
		useConversationStore.getState().reset()
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			selectedIds: new Set<string>(),
		})
		useSheetStore.getState().close()
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

	it('clicking New image prefills an image-generation prompt', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New image' }))
		expect(screen.getByPlaceholderText('Message...')).toHaveValue('Generate an image of ')
	})

	it('clicking New note creates a note and opens its sheet', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New note' }))

		const entities = Object.values(useEntityStore.getState().entities)
		expect(entities).toHaveLength(1)
		expect(entities[0].type).toBe('note')
		expect(useEntityStore.getState().focusedId).toBe(entities[0].id)

		const sheet = useSheetStore.getState()
		expect(sheet.isOpen).toBe(true)
		expect(sheet.contentType).toBe('entity')
		expect(sheet.entityId).toBe(entities[0].id)
	})

	it('clicking New folder with no selection creates an empty folder entity', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		const folders = Object.values(useEntityStore.getState().entities).filter(
			(e) => e.type === 'folder',
		)
		expect(folders).toHaveLength(1)
		expect(folders[0].presentation).toBe('folder')
		expect(folders[0].state.child_ids).toEqual([])
	})

	it('clicking New folder with 2 selected entities gathers instead of creating a new folder', () => {
		const gatherSpy = vi.fn()
		const clearSelectionSpy = vi.fn()
		const entities: Record<string, Entity> = {
			a: makeEntity({ id: 'a' }),
			b: makeEntity({ id: 'b' }),
		}
		useEntityStore.setState({
			entities,
			selectedIds: new Set(['a', 'b']),
			gatherEntities: gatherSpy,
			clearSelection: clearSelectionSpy,
		})

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		expect(gatherSpy).toHaveBeenCalledTimes(1)
		expect(gatherSpy).toHaveBeenCalledWith(['a', 'b'], expect.any(Object))
		expect(clearSelectionSpy).toHaveBeenCalledTimes(1)
		expect(Object.values(useEntityStore.getState().entities).filter((e) => e.type === 'folder')).toHaveLength(
			0,
		)
	})
})

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'entity-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'card',
		position: { x: 100, y: 100, locked: false },
		size: { width: 232, height: 300 },
		z_index: 1,
		content: '',
		state: {},
		summary: '',
		created_by: 'user',
		archived: false,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		...overrides,
	}
}
