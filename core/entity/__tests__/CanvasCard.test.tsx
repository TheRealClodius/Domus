import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CanvasCard from '@/core/entity/CanvasCard'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import type { Entity } from '@/lib/types'

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

describe('CanvasCard', () => {
	const mockSetFocused = vi.fn()
	const mockRemove = vi.fn()

	beforeEach(() => {
		mockSetFocused.mockClear()
		mockRemove.mockClear()
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			setFocused: mockSetFocused,
			remove: mockRemove,
		})
	})

	afterEach(() => {
		useSheetStore.getState().close()
		cleanup()
	})

	it('renders entity summary text', () => {
		const entity = makeEntity({ summary: 'Quick project notes' })
		render(<CanvasCard entity={entity} />)
		expect(screen.getByText('Quick project notes')).toBeDefined()
	})

	it('renders entity type in metadata', () => {
		const entity = makeEntity({ type: 'note', summary: 'A note card' })
		render(<CanvasCard entity={entity} />)
		const metadata = screen.getByTestId('card-metadata')
		expect(metadata.textContent).toContain('note')
	})

	it('has data-testid canvas-card', () => {
		const entity = makeEntity()
		render(<CanvasCard entity={entity} />)
		expect(screen.getByTestId('canvas-card')).toBeDefined()
	})

	it('renders at fixed 232×300 dimensions regardless of entity.size', () => {
		const entity = makeEntity({ size: { width: 500, height: 400 } })
		const { container } = render(<CanvasCard entity={entity} />)
		const card = container.firstElementChild as HTMLElement
		expect(card.style.width).toBe('232px')
		expect(card.style.height).toBe('300px')
	})

	it('shows relative timestamp in metadata', () => {
		const recent = new Date(Date.now() - 30_000).toISOString()
		const entity = makeEntity({ updated_at: recent })
		render(<CanvasCard entity={entity} />)
		// Should render some relative time text (e.g. "just now", "30s ago")
		const metadata = screen.getByTestId('card-metadata')
		expect(metadata.textContent).toBeTruthy()
	})

	it('agent-created card has data-agent-glow attribute', () => {
		const now = new Date().toISOString()
		const entity = makeEntity({ created_by: 'agent', updated_at: now })
		const { container } = render(<CanvasCard entity={entity} />)
		const glowElement = container.querySelector('[data-agent-glow]')
		expect(glowElement).not.toBeNull()
	})

	it('renders expand, inbox, and delete buttons', () => {
		const entity = makeEntity({ summary: 'Test card' })
		render(<CanvasCard entity={entity} />)
		expect(screen.getByRole('button', { name: 'Expand' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'Move to inbox' })).toBeDefined()
		expect(screen.getByRole('button', { name: 'Delete' })).toBeDefined()
	})

	it('renders expand leftmost, then inbox and delete on right', () => {
		const entity = makeEntity({ summary: 'Test card' })
		render(<CanvasCard entity={entity} />)
		const buttons = screen.getAllByRole('button')
		const expandIdx = buttons.findIndex((b) => b.getAttribute('aria-label') === 'Expand')
		const inboxIdx = buttons.findIndex((b) => b.getAttribute('aria-label') === 'Move to inbox')
		const deleteIdx = buttons.findIndex((b) => b.getAttribute('aria-label') === 'Delete')
		expect(expandIdx).toBeLessThan(inboxIdx)
		expect(inboxIdx).toBeLessThan(deleteIdx)
	})

	it('renders grab handle at bottom of card', () => {
		const entity = makeEntity({ summary: 'Test card' })
		render(<CanvasCard entity={entity} />)
		expect(screen.getByTestId('grab-handle')).toBeDefined()
	})

	it('action buttons container is hidden by default (opacity-0)', () => {
		const entity = makeEntity({ summary: 'Test card' })
		render(<CanvasCard entity={entity} />)
		const actions = screen.getByTestId('card-actions')
		expect(actions.className).toContain('opacity-0')
	})

	it('click on card calls setFocused with entity id', () => {
		const entity = makeEntity({ id: 'card-99' })
		const { container } = render(<CanvasCard entity={entity} />)

		const rootElement = container.firstElementChild
		expect(rootElement).not.toBeNull()
		if (rootElement) {
			fireEvent.mouseDown(rootElement)
		}

		expect(mockSetFocused).toHaveBeenCalledWith('card-99')
	})

	it('delete button calls remove with entity id', () => {
		const entity = makeEntity({ id: 'card-del', summary: 'To delete' })
		render(<CanvasCard entity={entity} />)
		const btn = screen.getByRole('button', { name: 'Delete' })
		fireEvent.click(btn)
		expect(mockRemove).toHaveBeenCalledWith('card-del')
	})

	it('expand button opens sheet with entity id', () => {
		const entity = makeEntity({ id: 'card-1', summary: 'Test card' })
		render(<CanvasCard entity={entity} />)
		const btn = screen.getByRole('button', { name: 'Expand' })
		fireEvent.click(btn)
		const state = useSheetStore.getState()
		expect(state.isOpen).toBe(true)
		expect(state.entityId).toBe('card-1')
		expect(state.contentType).toBe('entity')
	})
})
