import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AgentChat from '@/core/chat/AgentChat'
import { markGathering } from '@/core/canvas/SpaceRenderer'
import { useConversationStore } from '@/core/chat/conversationStore'
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
		position: { x: 10, y: 20, locked: false },
		size: { width: 280, height: 200 },
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

function appendCanvas(width: number, height: number): HTMLDivElement {
	const canvas = document.createElement('div')
	canvas.setAttribute('data-testid', 'canvas')
	Object.defineProperty(canvas, 'clientWidth', { value: width, configurable: true })
	Object.defineProperty(canvas, 'clientHeight', { value: height, configurable: true })
	document.body.appendChild(canvas)
	return canvas
}

describe('AgentChat', () => {
	afterEach(() => {
		cleanup()
		useConversationStore.getState().reset()
		useEntityStore.setState({ entities: {}, focusedId: null, selectedIds: new Set<string>() })
		useSheetStore.getState().close()
		document.querySelectorAll('[data-testid="canvas"]').forEach((node) => node.remove())
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

	it('clicking "New image" pre-fills the prompt text', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New image' }))
		expect(screen.getByPlaceholderText('Message...')).toHaveValue('Generate an image of ')
	})

	it('clicking "New note" creates and focuses a note, then opens sheet', () => {
		appendCanvas(1000, 800)
		render(<AgentChat spaceId="space-1" userId="user-1" />)

		fireEvent.click(screen.getByRole('button', { name: 'New note' }))

		const entities = Object.values(useEntityStore.getState().entities)
		expect(entities).toHaveLength(1)
		expect(entities[0].type).toBe('note')
		expect(useEntityStore.getState().focusedId).toBe(entities[0].id)
		expect(useSheetStore.getState().isOpen).toBe(true)
		expect(useSheetStore.getState().entityId).toBe(entities[0].id)
	})

	it('clicking "New folder" with <2 selected creates a centered folder entity', () => {
		appendCanvas(1000, 800)
		useEntityStore.setState({
			entities: {
				'e-z': makeEntity({ id: 'e-z', z_index: 7 }),
			},
			selectedIds: new Set<string>(),
		})
		const uuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('folder-created-id')

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		const folder = useEntityStore.getState().entities['folder-created-id']
		expect(folder).toBeDefined()
		expect(folder.type).toBe('folder')
		expect(folder.presentation).toBe('folder')
		expect(folder.position.x).toBe(Math.round(1000 / 2 - FOLDER_SIZE / 2))
		expect(folder.position.y).toBe(Math.round(800 / 2 - FOLDER_SIZE / 2))
		expect(folder.z_index).toBe(8)
		expect(folder.state.child_ids).toEqual([])
		uuidSpy.mockRestore()
	})

	it('clicking "New folder" with >=2 selected gathers into computed canvas-relative target', () => {
		const canvas = appendCanvas(1000, 800)
		vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
			x: 20,
			y: 30,
			left: 20,
			top: 30,
			right: 1020,
			bottom: 830,
			width: 1000,
			height: 800,
			toJSON: () => ({}),
		})
		useEntityStore.setState({
			entities: {
				'child-1': makeEntity({ id: 'child-1', z_index: 1 }),
				'child-2': makeEntity({ id: 'child-2', z_index: 2 }),
				'existing-folder': makeEntity({
					id: 'existing-folder',
					presentation: 'folder',
					archived: false,
				}),
			},
			selectedIds: new Set<string>(['child-1', 'child-2']),
		})
		const gatherSpy = vi.spyOn(useEntityStore.getState(), 'gatherEntities').mockImplementation(() => {})
		const clearSelectionSpy = vi
			.spyOn(useEntityStore.getState(), 'clearSelection')
			.mockImplementation(() => {})

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		const folderBtn = screen.getByRole('button', { name: 'New folder' })
		vi.spyOn(folderBtn, 'getBoundingClientRect').mockReturnValue({
			x: 250,
			y: 200,
			left: 250,
			top: 200,
			right: 290,
			bottom: 240,
			width: 40,
			height: 40,
			toJSON: () => ({}),
		})

		fireEvent.click(folderBtn)

		expect(markGathering).toHaveBeenCalledWith(['child-1', 'child-2'])
		expect(gatherSpy).toHaveBeenCalledWith(['child-1', 'child-2'], { x: -34, y: 58 })
		expect(clearSelectionSpy).toHaveBeenCalledOnce()
		gatherSpy.mockRestore()
		clearSelectionSpy.mockRestore()
	})
})
