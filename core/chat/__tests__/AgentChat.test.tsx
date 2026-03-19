import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AgentChat from '@/core/chat/AgentChat'
import { useConversationStore } from '@/core/chat/conversationStore'
import { markGathering } from '@/core/canvas/SpaceRenderer'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import { FOLDER_SIZE } from '@/core/spatial/folderConstants'
import type { Entity } from '@/lib/types'

vi.mock('@/core/chat/useAgentStream', () => ({
	sendMessage: vi.fn().mockRejectedValue(new Error('no server')),
	parseSSEEvent: vi.fn(),
	serializeContextItems: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/core/canvas/SpaceRenderer', () => ({
	markGathering: vi.fn(),
}))

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
			agentActiveIds: new Set<string>(),
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
		document.querySelectorAll('[data-testid="canvas"]').forEach((node) => node.remove())
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

	it('clicking "New image" prefills the prompt text', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		const textarea = screen.getByPlaceholderText('Message...')
		fireEvent.click(screen.getByRole('button', { name: 'New image' }))
		expect(textarea).toHaveValue('Generate an image of ')
	})

	it('clicking "New note" creates a note entity and opens the sheet', () => {
		const canvas = document.createElement('div')
		canvas.setAttribute('data-testid', 'canvas')
		Object.defineProperty(canvas, 'clientWidth', { value: 1000, configurable: true })
		Object.defineProperty(canvas, 'clientHeight', { value: 700, configurable: true })
		document.body.appendChild(canvas)
		vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('note-entity-id')

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New note' }))

		const entities = Object.values(useEntityStore.getState().entities)
		expect(entities).toHaveLength(1)
		const created = entities[0]
		expect(created.id).toBe('note-entity-id')
		expect(created.type).toBe('note')
		expect(created.space_id).toBe('space-1')
		expect(created.user_id).toBe('user-1')
		expect(created.position).toEqual({ x: 384, y: 200, locked: false })
		expect(useEntityStore.getState().focusedId).toBe(created.id)
		expect(useSheetStore.getState().isOpen).toBe(true)
		expect(useSheetStore.getState().entityId).toBe(created.id)
		expect(useSheetStore.getState().contentType).toBe('entity')
	})

	it('clicking "New folder" with a multi-selection gathers selected entities at canvas-relative position', () => {
		const canvas = document.createElement('div')
		canvas.setAttribute('data-testid', 'canvas')
		canvas.getBoundingClientRect = vi.fn(() => ({
			x: 100,
			y: 80,
			left: 100,
			top: 80,
			right: 1000,
			bottom: 680,
			width: 900,
			height: 600,
			toJSON: () => ({}),
		}))
		document.body.appendChild(canvas)

		useEntityStore.setState({
			entities: {
				a: makeEntity({ id: 'a' }),
				b: makeEntity({ id: 'b', z_index: 2 }),
				f1: makeEntity({
					id: 'f1',
					type: 'folder',
					presentation: 'folder',
					z_index: 3,
					size: { width: FOLDER_SIZE, height: FOLDER_SIZE },
				}),
			},
			selectedIds: new Set(['a', 'b']),
		})
		const gatherSpy = vi.spyOn(useEntityStore.getState(), 'gatherEntities')
		const clearSpy = vi.spyOn(useEntityStore.getState(), 'clearSelection')

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		const folderButton = screen.getByRole('button', { name: 'New folder' })
		vi.spyOn(folderButton, 'getBoundingClientRect').mockReturnValue({
			x: 560,
			y: 300,
			left: 560,
			top: 300,
			right: 590,
			bottom: 330,
			width: 30,
			height: 30,
			toJSON: () => ({}),
		} as DOMRect)

		fireEvent.click(folderButton)

		expect(markGathering).toHaveBeenCalledWith(['a', 'b'])
		const expectedX = 560 - 100 - FOLDER_SIZE - 12 - 1 * (FOLDER_SIZE + 12)
		const expectedY = 300 - 80 + 30 / 2 - FOLDER_SIZE - 12
		expect(gatherSpy).toHaveBeenCalledWith(['a', 'b'], { x: expectedX, y: expectedY })
		expect(clearSpy).toHaveBeenCalled()
	})
})
