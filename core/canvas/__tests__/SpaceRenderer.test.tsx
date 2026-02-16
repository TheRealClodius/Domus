import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import SpaceRenderer from '@/core/canvas/SpaceRenderer'
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

describe('SpaceRenderer', () => {
	beforeEach(() => {
		useEntityStore.setState({ entities: {}, focusedId: null })
	})

	afterEach(() => {
		cleanup()
	})

	it('renders a canvas container element', () => {
		render(<SpaceRenderer spaceId="space-1" />)

		expect(screen.getByTestId('canvas')).toBeDefined()
	})

	it('renders entities from the entity store at their positions', () => {
		const entities: Record<string, Entity> = {
			a: makeEntity({
				id: 'a',
				space_id: 'space-1',
				content: 'First note',
				position: { x: 100, y: 200, locked: false },
				z_index: 1,
			}),
			b: makeEntity({
				id: 'b',
				space_id: 'space-1',
				content: 'Second note',
				position: { x: 300, y: 400, locked: false },
				z_index: 2,
			}),
		}
		useEntityStore.setState({ entities })

		render(<SpaceRenderer spaceId="space-1" />)

		expect(screen.getByText('First note')).toBeDefined()
		expect(screen.getByText('Second note')).toBeDefined()
	})

	it('does NOT render entities with presentation hidden', () => {
		const entities: Record<string, Entity> = {
			visible: makeEntity({
				id: 'visible',
				space_id: 'space-1',
				content: 'Visible entity',
				presentation: 'window',
			}),
			hidden: makeEntity({
				id: 'hidden',
				space_id: 'space-1',
				content: 'Hidden entity',
				presentation: 'hidden',
			}),
		}
		useEntityStore.setState({ entities })

		render(<SpaceRenderer spaceId="space-1" />)

		expect(screen.getByText('Visible entity')).toBeDefined()
		expect(screen.queryByText('Hidden entity')).toBeNull()
	})

	it('shows empty state text when no entities', () => {
		useEntityStore.setState({ entities: {} })

		render(<SpaceRenderer spaceId="space-1" />)

		expect(screen.getByText('Talk to the agent or open an app from the dock.')).toBeDefined()
	})

	it('window area layer exists with pointer-events none', () => {
		const entities: Record<string, Entity> = {
			a: makeEntity({ id: 'a', summary: 'A note' }),
		}
		useEntityStore.setState({ entities })

		render(<SpaceRenderer spaceId="space-1" />)

		const windowArea = screen.getByTestId('window-area') as HTMLElement
		expect(windowArea.style.pointerEvents).toBe('none')
	})

	it('window area layer sits below prompt bar (z-index 10)', () => {
		const entities: Record<string, Entity> = {
			a: makeEntity({ id: 'a', summary: 'A note' }),
		}
		useEntityStore.setState({ entities })

		render(<SpaceRenderer spaceId="space-1" />)

		const windowArea = screen.getByTestId('window-area') as HTMLElement
		expect(windowArea.style.zIndex).toBe('10')
	})

	it('dock renders buttons for Chat and Calendar', () => {
		render(<SpaceRenderer spaceId="space-1" />)

		expect(screen.getByLabelText('Chat')).toBeDefined()
		expect(screen.getByLabelText('Calendar')).toBeDefined()
	})

	it('clicking Chat dock button adds a chat entity to the store', () => {
		render(<SpaceRenderer spaceId="space-1" />)

		fireEvent.click(screen.getByLabelText('Chat'))

		const entities = Object.values(useEntityStore.getState().entities)
		expect(entities.length).toBe(1)
		expect(entities[0].type).toBe('chat')
	})

	it('clicking Calendar dock button adds a calendar entity to the store', () => {
		render(<SpaceRenderer spaceId="space-1" />)

		fireEvent.click(screen.getByLabelText('Calendar'))

		const entities = Object.values(useEntityStore.getState().entities)
		expect(entities.length).toBe(1)
		expect(entities[0].type).toBe('calendar')
	})

	it('new entity gets focused after creation', () => {
		render(<SpaceRenderer spaceId="space-1" />)

		fireEvent.click(screen.getByLabelText('Chat'))

		const state = useEntityStore.getState()
		const entities = Object.values(state.entities)
		expect(state.focusedId).toBe(entities[0].id)
	})
})
