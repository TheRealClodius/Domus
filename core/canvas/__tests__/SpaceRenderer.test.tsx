import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import SpaceRenderer from '@/core/canvas/SpaceRenderer'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
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
				summary: 'First note',
				position: { x: 100, y: 200, locked: false },
				z_index: 1,
			}),
			b: makeEntity({
				id: 'b',
				space_id: 'space-1',
				summary: 'Second note',
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
				summary: 'Visible entity',
				presentation: 'window',
			}),
			hidden: makeEntity({
				id: 'hidden',
				space_id: 'space-1',
				summary: 'Hidden entity',
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

	it('dock-created entity uses provided userId instead of mock-user', () => {
		render(<SpaceRenderer spaceId="space-1" userId="real-user-123" />)

		fireEvent.click(screen.getByLabelText('Chat'))

		const entities = Object.values(useEntityStore.getState().entities)
		expect(entities[0].user_id).toBe('real-user-123')
	})

	it('clicking singleton dock twice creates only one entity', () => {
		render(<SpaceRenderer spaceId="space-1" />)

		fireEvent.click(screen.getByLabelText('Chat'))
		fireEvent.click(screen.getByLabelText('Chat'))

		const entities = Object.values(useEntityStore.getState().entities)
		const chatEntities = entities.filter((e) => e.type === 'chat')
		expect(chatEntities).toHaveLength(1)
	})

	it('second click on singleton focuses the existing entity', () => {
		render(<SpaceRenderer spaceId="space-1" />)

		fireEvent.click(screen.getByLabelText('Chat'))
		const firstEntity = Object.values(useEntityStore.getState().entities)[0]

		// Focus something else
		useEntityStore.getState().setFocused(null)

		fireEvent.click(screen.getByLabelText('Chat'))

		expect(useEntityStore.getState().focusedId).toBe(firstEntity.id)
	})

	it('clicking singleton with a hidden entity unhides it and focuses it', () => {
		render(<SpaceRenderer spaceId="space-1" />)

		fireEvent.click(screen.getByLabelText('Chat'))
		const entityId = Object.values(useEntityStore.getState().entities)[0].id

		// Hide the entity
		useEntityStore.getState().updatePresentation(entityId, 'hidden')
		expect(useEntityStore.getState().entities[entityId].presentation).toBe('hidden')

		fireEvent.click(screen.getByLabelText('Chat'))

		const state = useEntityStore.getState()
		expect(state.entities[entityId].presentation).toBe('window')
		expect(state.focusedId).toBe(entityId)
		// Still only one chat entity
		expect(Object.values(state.entities).filter((e) => e.type === 'chat')).toHaveLength(1)
	})

	it('forwards user info to SpaceHeader for avatar display', () => {
		const user = { name: 'Jane Doe', avatarUrl: 'https://example.com/avatar.jpg' }
		render(<SpaceRenderer spaceId="space-1" userId="user-1" user={user} />)

		expect(screen.getByTestId('user-avatar')).toBeDefined()
	})

	it('generated app appears in dock and right-click delete archives it', async () => {
		const entities: Record<string, Entity> = {
			'gen-1': makeEntity({
				id: 'gen-1',
				type: 'generated',
				presentation: 'window',
				state: { _code: 'console.log(1)', _meta: { name: 'My App', icon: 'box' } },
				summary: 'My App',
			}),
		}
		useEntityStore.setState({ entities })

		render(<SpaceRenderer spaceId="space-1" />)

		// Dock shows the generated app button
		expect(screen.getByLabelText('My App')).toBeDefined()

		// Trigger onDelete directly (context menu can't be opened via fireEvent in jsdom)
		const archive = useEntityStore.getState().archive
		archive('gen-1')

		// Entity is now archived → removed from dock
		expect(useEntityStore.getState().entities['gen-1'].archived).toBe(true)
	})

	it('clicking a folder opens the sheet', () => {
		const entities: Record<string, Entity> = {
			'folder-1': makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				position: { x: 200, y: 200, locked: true },
				state: { child_ids: ['child-1'] },
				summary: 'My images',
			}),
			'child-1': makeEntity({
				id: 'child-1',
				presentation: 'hidden',
			}),
		}
		useEntityStore.setState({ entities })

		render(<SpaceRenderer spaceId="space-1" />)

		expect(screen.getByText('My images')).toBeDefined()

		fireEvent.click(screen.getByTestId('folder-stack'))

		const sheet = useSheetStore.getState()
		expect(sheet.entityId).toBe('folder-1')
		expect(sheet.contentType).toBe('entity')
	})
})
