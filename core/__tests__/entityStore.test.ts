import { beforeEach, describe, expect, it } from 'vitest'
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

describe('entityStore', () => {
	beforeEach(() => {
		useEntityStore.setState({ entities: {}, focusedId: null })
	})

	// --- upsert ---

	it('upsert adds a new entity to the store', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.getState().upsert(entity)

		const stored = useEntityStore.getState().entities.a
		expect(stored).toEqual(entity)
	})

	it('upsert with same id updates the existing entity', () => {
		const entity = makeEntity({ id: 'a', content: 'original' })
		useEntityStore.getState().upsert(entity)

		const updated = makeEntity({ id: 'a', content: 'updated' })
		useEntityStore.getState().upsert(updated)

		const stored = useEntityStore.getState().entities.a
		expect(stored.content).toBe('updated')
		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(1)
	})

	// --- remove ---

	it('remove removes an entity by id', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.getState().upsert(entity)
		useEntityStore.getState().remove('a')

		expect(useEntityStore.getState().entities.a).toBeUndefined()
	})

	it('remove on non-existent id is a no-op', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.getState().upsert(entity)

		// Should not throw
		useEntityStore.getState().remove('does-not-exist')

		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(1)
	})

	// --- bumpZIndex ---

	it('bumpZIndex sets the entity to max z_index + 1 across all entities', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', z_index: 1 }))
		useEntityStore.getState().upsert(makeEntity({ id: 'b', z_index: 5 }))
		useEntityStore.getState().upsert(makeEntity({ id: 'c', z_index: 3 }))

		useEntityStore.getState().bumpZIndex('a')

		const bumped = useEntityStore.getState().entities.a
		expect(bumped.z_index).toBe(6)
	})

	it('bumpZIndex on entity already at top does not increment', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', z_index: 1 }))
		useEntityStore.getState().upsert(makeEntity({ id: 'b', z_index: 5 }))

		useEntityStore.getState().bumpZIndex('b')

		const top = useEntityStore.getState().entities.b
		expect(top.z_index).toBe(5)
	})

	// --- getEntity ---

	it('getEntity returns the entity for a valid id', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.getState().upsert(entity)

		const result = useEntityStore.getState().getEntity('a')
		expect(result).toEqual(entity)
	})

	it('getEntity returns undefined for unknown id', () => {
		const result = useEntityStore.getState().getEntity('nonexistent')
		expect(result).toBeUndefined()
	})

	// --- getEntitiesSorted ---

	it('getEntitiesSorted returns entities sorted by z_index ascending', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'c', z_index: 10 }))
		useEntityStore.getState().upsert(makeEntity({ id: 'a', z_index: 1 }))
		useEntityStore.getState().upsert(makeEntity({ id: 'b', z_index: 5 }))

		const sorted = useEntityStore.getState().getEntitiesSorted()
		const zIndexes = sorted.map((e) => e.z_index)
		expect(zIndexes).toEqual([1, 5, 10])
	})

	// --- getVisibleEntities ---

	it('getVisibleEntities returns only entities with presentation window, card, or sidebar', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', presentation: 'window' }))
		useEntityStore.getState().upsert(makeEntity({ id: 'b', presentation: 'card' }))
		useEntityStore.getState().upsert(makeEntity({ id: 'c', presentation: 'sidebar' }))
		useEntityStore.getState().upsert(makeEntity({ id: 'd', presentation: 'hidden' }))

		const visible = useEntityStore.getState().getVisibleEntities()
		const ids = visible.map((e) => e.id)

		expect(ids).toHaveLength(3)
		expect(ids).toContain('a')
		expect(ids).toContain('b')
		expect(ids).toContain('c')
		expect(ids).not.toContain('d')
	})

	// --- setFocused ---

	it('setFocused sets focusedId and bumps z-index', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', z_index: 1 }))
		useEntityStore.getState().upsert(makeEntity({ id: 'b', z_index: 5 }))

		useEntityStore.getState().setFocused('a')

		expect(useEntityStore.getState().focusedId).toBe('a')
		expect(useEntityStore.getState().entities.a.z_index).toBe(6)
	})

	it('setFocused(null) clears focusedId', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a' }))
		useEntityStore.getState().setFocused('a')
		useEntityStore.getState().setFocused(null)

		expect(useEntityStore.getState().focusedId).toBeNull()
	})

	// --- updatePosition ---

	it('updatePosition updates position and sets locked to true', () => {
		useEntityStore
			.getState()
			.upsert(makeEntity({ id: 'a', position: { x: 0, y: 0, locked: false } }))

		useEntityStore.getState().updatePosition('a', { x: 100, y: 200 })

		const entity = useEntityStore.getState().entities.a
		expect(entity.position.x).toBe(100)
		expect(entity.position.y).toBe(200)
		expect(entity.position.locked).toBe(true)
	})

	// --- updateSize ---

	it('updateSize updates dimensions', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', size: { width: 400, height: 300 } }))

		useEntityStore.getState().updateSize('a', { width: 600, height: 500 })

		const entity = useEntityStore.getState().entities.a
		expect(entity.size.width).toBe(600)
		expect(entity.size.height).toBe(500)
	})

	it('updateSize enforces minimum 300×200', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', size: { width: 400, height: 300 } }))

		useEntityStore.getState().updateSize('a', { width: 100, height: 50 })

		const entity = useEntityStore.getState().entities.a
		expect(entity.size.width).toBe(300)
		expect(entity.size.height).toBe(200)
	})

	// --- loadMockData ---

	it('loadMockData populates store with entities', () => {
		useEntityStore.getState().loadMockData()

		const entities = useEntityStore.getState().entities
		expect(Object.keys(entities).length).toBeGreaterThan(0)
	})
})
