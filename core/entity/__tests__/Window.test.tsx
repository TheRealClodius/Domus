import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Window from '@/core/entity/Window'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'entity-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'window',
		position: { x: 0, y: 0, locked: false },
		size: { width: 400, height: 300 },
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

describe('Window', () => {
	const mockUpdatePresentation = vi.fn()
	const mockSetFocused = vi.fn()

	beforeEach(() => {
		mockUpdatePresentation.mockClear()
		mockSetFocused.mockClear()
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			updatePresentation: mockUpdatePresentation,
			setFocused: mockSetFocused,
		})
	})

	afterEach(() => {
		cleanup()
	})

	it('renders only a close button (no minimize or maximize)', () => {
		const entity = makeEntity()
		render(<Window entity={entity} isFocused={false} />)

		expect(screen.getByRole('button', { name: 'Close window' })).toBeDefined()
		expect(screen.queryByRole('button', { name: 'Minimize window' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'Maximize window' })).toBeNull()
	})

	it('close button hides entity by setting presentation to hidden', () => {
		const entity = makeEntity({ id: 'win-42' })
		render(<Window entity={entity} isFocused={false} />)

		const closeButton = screen.getByRole('button', { name: 'Close window' })
		fireEvent.click(closeButton)

		expect(mockUpdatePresentation).toHaveBeenCalledWith('win-42', 'hidden')
	})

	it('click on window calls setFocused with entity id', () => {
		const entity = makeEntity({ id: 'win-99' })
		const { container } = render(<Window entity={entity} isFocused={false} />)

		const rootElement = container.firstElementChild
		expect(rootElement).not.toBeNull()
		if (rootElement) {
			fireEvent.mouseDown(rootElement)
		}

		expect(mockSetFocused).toHaveBeenCalledWith('win-99')
	})

	it('agent-created entity has a data-agent-glow attribute', () => {
		const now = new Date().toISOString()
		const entity = makeEntity({
			created_by: 'agent',
			summary: 'Agent note',
			updated_at: now,
		})

		const { container } = render(<Window entity={entity} isFocused={false} />)

		const glowElement = container.querySelector('[data-agent-glow]')
		expect(glowElement).not.toBeNull()
	})

	it('renders resize handles', () => {
		const entity = makeEntity()
		const { container } = render(<Window entity={entity} isFocused={true} />)

		const handles = container.querySelectorAll('[data-resize-handle]')
		expect(handles.length).toBe(8)
	})

	it('resize visuals are separate from hit areas and positioned inside window', () => {
		const entity = makeEntity()
		const { container } = render(<Window entity={entity} isFocused={false} />)

		const visuals = container.querySelectorAll('[data-resize-visual]')
		expect(visuals.length).toBe(8)
		for (const visual of visuals) {
			expect((visual as HTMLElement).style.position).toBe('absolute')
			expect(visual.querySelector('svg')).not.toBeNull()
		}
	})

	it('corner handle hit areas extend outside window with negative offset', () => {
		const entity = makeEntity()
		const { container } = render(<Window entity={entity} isFocused={false} />)

		const se = container.querySelector('[data-resize-handle="se"]') as HTMLElement
		expect(se.style.bottom).toBe('-8px')
		expect(se.style.right).toBe('-8px')
	})

	it('header is absolutely positioned above content', () => {
		const entity = makeEntity()
		const { container } = render(<Window entity={entity} isFocused={false} />)

		const frame = container.querySelector('[data-window-frame]') as HTMLElement
		expect(frame).not.toBeNull()
		expect(frame.className).toContain('absolute')
	})

	it('header has no background — controls float over content', () => {
		const entity = makeEntity()
		const { container } = render(<Window entity={entity} isFocused={false} />)

		const frame = container.querySelector('[data-window-frame]') as HTMLElement
		expect(frame.style.backgroundColor).toBe('')
		expect(frame.style.backdropFilter).toBe('')
	})

	it('content area has horizontal padding only — apps own vertical insets', () => {
		const entity = makeEntity({ content: 'Some content' })
		const { container } = render(<Window entity={entity} isFocused={false} />)

		const content = container.querySelector('.overflow-auto') as HTMLElement
		expect(content.className).toContain('px-4')
		expect(content.className).not.toContain('pt-')
		expect(content.className).not.toContain('pb-')
	})

	it('content area is stacking-isolated so app internals cannot escape above header', () => {
		const entity = makeEntity()
		const { container } = render(<Window entity={entity} isFocused={false} />)

		const content = container.querySelector('.overflow-auto') as HTMLElement
		expect(content.className).toContain('isolate')
	})

	it('renders headerActions when provided', () => {
		const entity = makeEntity()
		render(
			<Window
				entity={entity}
				isFocused={false}
				headerActions={<button type="button">Options</button>}
			/>,
		)

		expect(screen.getByRole('button', { name: 'Options' })).toBeDefined()
	})
})
