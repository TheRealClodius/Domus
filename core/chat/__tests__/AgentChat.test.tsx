import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { noteApp } from '@/apps/notes'
import AgentChat from '@/core/chat/AgentChat'
import { useConversationStore } from '@/core/chat/conversationStore'
import { markGathering } from '@/core/canvas/SpaceRenderer'
import { createEntityFromApp } from '@/core/canvas/createEntityFromApp'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import { FOLDER_SIZE } from '@/core/spatial/folderConstants'
import type { Entity } from '@/lib/types'

vi.mock('@/core/chat/useAgentStream', () => ({
	sendMessage: vi.fn().mockRejectedValue(new Error('no server')),
	parseSSEEvent: vi.fn(),
	serializeContextItems: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/core/canvas/createEntityFromApp', () => ({
	createEntityFromApp: vi.fn(),
}))

vi.mock('@/core/canvas/SpaceRenderer', async () => {
	const actual = await vi.importActual<typeof import('@/core/canvas/SpaceRenderer')>(
		'@/core/canvas/SpaceRenderer',
	)
	return {
		...actual,
		markGathering: vi.fn(),
	}
})

const initialEntityStoreState = useEntityStore.getState()

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'entity-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'card',
		position: { x: 0, y: 0, locked: false },
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

function mountCanvas(width: number, height: number) {
	const canvas = document.createElement('div')
	canvas.setAttribute('data-testid', 'canvas')
	Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width })
	Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height })
	canvas.getBoundingClientRect = () =>
		({
			left: 0,
			top: 0,
			right: width,
			bottom: height,
			width,
			height,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		}) as DOMRect
	document.body.appendChild(canvas)
	return canvas
}

describe('AgentChat', () => {
	beforeEach(() => {
		useConversationStore.getState().reset()
		useEntityStore.setState({
			...initialEntityStoreState,
			entities: {},
			selectedIds: new Set<string>(),
			focusedId: null,
			agentActiveIds: new Set<string>(),
		})
		useSheetStore.getState().close()
	})

	afterEach(() => {
		cleanup()
		useConversationStore.getState().reset()
		useSheetStore.getState().close()
		for (const canvas of Array.from(document.querySelectorAll('[data-testid="canvas"]'))) {
			canvas.remove()
		}
		vi.clearAllMocks()
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

	it('clicking New image prefills the prompt text', () => {
		render(<AgentChat spaceId="space-1" userId="user-1" />)

		fireEvent.click(screen.getByRole('button', { name: 'New image' }))

		expect(screen.getByPlaceholderText('Message...')).toHaveValue('Generate an image of ')
	})

	it('clicking New note creates a note entity and opens sheet', () => {
		const mockUpsert = vi.fn()
		const mockSetFocused = vi.fn()
		const created = makeEntity({
			id: 'note-created',
			type: 'note',
			presentation: 'window',
			summary: 'New note',
		})
		vi.mocked(createEntityFromApp).mockReturnValue(created)
		mountCanvas(900, 600)

		useEntityStore.setState({
			entities: { existing: makeEntity({ id: 'existing' }) },
			upsert: mockUpsert,
			setFocused: mockSetFocused,
		})

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New note' }))

		expect(createEntityFromApp).toHaveBeenCalledWith(noteApp, {
			spaceId: 'space-1',
			userId: 'user-1',
			entityCount: 1,
			viewportWidth: 900,
			viewportHeight: 600,
		})
		expect(mockUpsert).toHaveBeenCalledWith(created)
		expect(mockSetFocused).toHaveBeenCalledWith('note-created')
		expect(useSheetStore.getState().isOpen).toBe(true)
		expect(useSheetStore.getState().entityId).toBe('note-created')
		expect(useSheetStore.getState().contentType).toBe('entity')
	})

	it('clicking New folder with multi-selection gathers selected entities', () => {
		const mockUpsert = vi.fn()
		const mockGatherEntities = vi.fn()
		const mockClearSelection = vi.fn()
		useEntityStore.setState({
			entities: {
				a: makeEntity({ id: 'a' }),
				b: makeEntity({ id: 'b' }),
				// Existing visible folder shifts gather target left; keep branch covered.
				existingFolder: makeEntity({
					id: 'existing-folder',
					type: 'folder',
					presentation: 'folder',
					archived: false,
				}),
			},
			selectedIds: new Set(['a', 'b']),
			upsert: mockUpsert,
			gatherEntities: mockGatherEntities,
			clearSelection: mockClearSelection,
		})

		render(<AgentChat spaceId="space-1" userId="user-1" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		expect(markGathering).toHaveBeenCalledWith(['a', 'b'])
		expect(mockGatherEntities).toHaveBeenCalledTimes(1)
		expect(mockGatherEntities.mock.calls[0]?.[0]).toEqual(['a', 'b'])
		expect(mockGatherEntities.mock.calls[0]?.[1]).toEqual(
			expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
		)
		expect(mockClearSelection).toHaveBeenCalledOnce()
		expect(mockUpsert).not.toHaveBeenCalled()
	})

	it('clicking New folder with fewer than two selections creates centered folder', () => {
		const mockUpsert = vi.fn()
		const mockGatherEntities = vi.fn()
		const mockClearSelection = vi.fn()
		vi.spyOn(crypto, 'randomUUID').mockReturnValue('folder-created')
		mountCanvas(1000, 700)

		useEntityStore.setState({
			entities: {
				one: makeEntity({ id: 'one', z_index: 3 }),
				two: makeEntity({ id: 'two', z_index: 8 }),
			},
			selectedIds: new Set(['one']),
			upsert: mockUpsert,
			gatherEntities: mockGatherEntities,
			clearSelection: mockClearSelection,
		})

		render(<AgentChat spaceId="space-9" userId="user-9" />)
		fireEvent.click(screen.getByRole('button', { name: 'New folder' }))

		expect(markGathering).not.toHaveBeenCalled()
		expect(mockGatherEntities).not.toHaveBeenCalled()
		expect(mockClearSelection).not.toHaveBeenCalled()
		expect(mockUpsert).toHaveBeenCalledOnce()
		expect(mockUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'folder-created',
				space_id: 'space-9',
				user_id: 'user-9',
				type: 'folder',
				presentation: 'folder',
				size: { width: FOLDER_SIZE, height: FOLDER_SIZE },
				z_index: 9,
				summary: 'New folder',
				state: { child_ids: [] },
			}),
		)

		const createdFolder = mockUpsert.mock.calls[0]?.[0] as Entity
		expect(createdFolder.position).toEqual({
			x: Math.round(1000 / 2 - FOLDER_SIZE / 2),
			y: Math.round(700 / 2 - FOLDER_SIZE / 2),
			locked: true,
		})
	})
})
