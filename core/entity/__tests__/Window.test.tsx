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
	const mockRemove = vi.fn()
	const mockSetFocused = vi.fn()

	beforeEach(() => {
		mockRemove.mockClear()
		mockSetFocused.mockClear()
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			remove: mockRemove,
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

	it('close button calls entity store remove with entity id', () => {
		const entity = makeEntity({ id: 'win-42' })
		render(<Window entity={entity} isFocused={false} />)

		const closeButton = screen.getByRole('button', { name: 'Close window' })
		fireEvent.click(closeButton)

		expect(mockRemove).toHaveBeenCalledWith('win-42')
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

		const header = container.querySelector('[data-window-header]') as HTMLElement
		expect(header).not.toBeNull()
		expect(header.className).toContain('absolute')
		expect(header.className).toContain('z-10')
	})

	it('header has glassmorphic background style', () => {
		const entity = makeEntity()
		const { container } = render(<Window entity={entity} isFocused={false} />)

		const header = container.querySelector('[data-window-header]') as HTMLElement
		expect(header.style.backgroundColor).toBe('rgba(255, 255, 255, 0.93)')
		expect(header.style.backdropFilter).toBe('blur(4px)')
	})

	it('content area has pt-10 top padding to account for absolute header', () => {
		const entity = makeEntity({ content: 'Some content' })
		const { container } = render(<Window entity={entity} isFocused={false} />)

		const content = container.querySelector('.scroll-fade') as HTMLElement
		expect(content.className).toContain('pt-10')
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
