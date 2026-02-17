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
		useEntityStore.setState({ entities: {}, focusedId: null, _pendingMap: {} })
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

	it('bumpZIndex bumps when entities share the same z_index', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', z_index: 0 }))
		useEntityStore.getState().upsert(makeEntity({ id: 'b', z_index: 0 }))

		useEntityStore.getState().bumpZIndex('a')

		expect(useEntityStore.getState().entities.a.z_index).toBe(1)
	})

	it('bumpZIndex is no-op for a single entity', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', z_index: 3 }))

		useEntityStore.getState().bumpZIndex('a')

		expect(useEntityStore.getState().entities.a.z_index).toBe(3)
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

	// --- archive ---

	it('archive sets archived: true and updates updated_at', () => {
		const entity = makeEntity({ id: 'a', archived: false, updated_at: '2020-01-01T00:00:00Z' })
		useEntityStore.getState().upsert(entity)

		useEntityStore.getState().archive('a')

		const stored = useEntityStore.getState().entities.a
		expect(stored.archived).toBe(true)
		expect(stored.updated_at).not.toBe('2020-01-01T00:00:00Z')
	})

	it('archive is no-op for missing entity', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a' }))

		useEntityStore.getState().archive('nonexistent')

		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(1)
	})

	// --- getVisibleEntities ---

	it('getVisibleEntities excludes hidden and archived entities', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', presentation: 'window' }))
		useEntityStore.getState().upsert(makeEntity({ id: 'b', presentation: 'card' }))
		useEntityStore.getState().upsert(makeEntity({ id: 'c', presentation: 'hidden' }))
		useEntityStore
			.getState()
			.upsert(makeEntity({ id: 'd', presentation: 'window', archived: true }))

		const visible = useEntityStore.getState().getVisibleEntities()
		const ids = visible.map((e) => e.id)

		expect(ids).toHaveLength(2)
		expect(ids).toContain('a')
		expect(ids).toContain('b')
		expect(ids).not.toContain('c')
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

	// --- updateContent ---

	it('updateContent changes entity content', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.getState().upsert(entity)

		useEntityStore.getState().updateContent('a', '{"type":"doc","content":[]}')

		expect(useEntityStore.getState().entities.a.content).toBe('{"type":"doc","content":[]}')
	})

	it('updateContent updates updated_at timestamp', () => {
		const entity = makeEntity({ id: 'a', updated_at: '2020-01-01T00:00:00Z' })
		useEntityStore.getState().upsert(entity)

		useEntityStore.getState().updateContent('a', 'new content')

		const updated = useEntityStore.getState().entities.a
		expect(updated.updated_at).not.toBe('2020-01-01T00:00:00Z')
	})

	it('updateContent is no-op for missing entity', () => {
		useEntityStore.getState().updateContent('nonexistent', 'content')

		expect(useEntityStore.getState().entities.nonexistent).toBeUndefined()
	})

	// --- updateState ---

	it('updateState sets state, summary, and updated_at on an existing entity', () => {
		const entity = makeEntity({
			id: 'a',
			state: {},
			summary: '',
			updated_at: '2020-01-01T00:00:00Z',
		})
		useEntityStore.getState().upsert(entity)

		useEntityStore
			.getState()
			.updateState(
				'a',
				{ view: 'week', selected_date: '2026-03-15' },
				'Calendar — March 2026 (week)',
			)

		const stored = useEntityStore.getState().entities.a
		expect(stored.state).toEqual({ view: 'week', selected_date: '2026-03-15' })
		expect(stored.summary).toBe('Calendar — March 2026 (week)')
		expect(stored.updated_at).not.toBe('2020-01-01T00:00:00Z')
	})

	it('updateState is no-op for missing entity', () => {
		useEntityStore.getState().updateState('nonexistent', { view: 'day' }, 'Day view')

		expect(useEntityStore.getState().entities.nonexistent).toBeUndefined()
	})

	it('updateState preserves other entity fields', () => {
		const entity = makeEntity({
			id: 'a',
			content: 'keep me',
			type: 'calendar',
			position: { x: 42, y: 99, locked: true },
		})
		useEntityStore.getState().upsert(entity)

		useEntityStore.getState().updateState('a', { view: 'month' }, 'Calendar — month')

		const stored = useEntityStore.getState().entities.a
		expect(stored.content).toBe('keep me')
		expect(stored.type).toBe('calendar')
		expect(stored.position).toEqual({ x: 42, y: 99, locked: true })
	})

	// --- updatePresentation ---

	it('updatePresentation sets presentation correctly', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', presentation: 'hidden' }))

		useEntityStore.getState().updatePresentation('a', 'window')

		expect(useEntityStore.getState().entities.a.presentation).toBe('window')
	})

	it('updatePresentation is no-op for missing entity', () => {
		useEntityStore.getState().updatePresentation('nonexistent', 'window')

		expect(useEntityStore.getState().entities.nonexistent).toBeUndefined()
	})

	// --- hydrate ---

	it('hydrate bulk-loads entities into an empty store', () => {
		const entities = [
			makeEntity({ id: 'a', z_index: 1 }),
			makeEntity({ id: 'b', z_index: 2 }),
			makeEntity({ id: 'c', z_index: 3 }),
		]

		useEntityStore.getState().hydrate(entities)

		const stored = useEntityStore.getState().entities
		expect(Object.keys(stored)).toHaveLength(3)
		expect(stored.a.id).toBe('a')
		expect(stored.b.id).toBe('b')
		expect(stored.c.id).toBe('c')
	})

	it('subsequent upsert overwrites a hydrated entity', () => {
		useEntityStore.getState().hydrate([makeEntity({ id: 'a', content: 'from-db' })])

		const updated = makeEntity({ id: 'a', content: 'from-agent' })
		useEntityStore.getState().upsert(updated)

		expect(useEntityStore.getState().entities.a.content).toBe('from-agent')
		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(1)
	})

	it('hydrate with empty array clears the store', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'leftover' }))

		useEntityStore.getState().hydrate([])

		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(0)
	})

	// --- loadMockData ---

	it('loadMockData clears entities (no mock data)', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'leftover' }))
		useEntityStore.getState().loadMockData()

		const entities = useEntityStore.getState().entities
		expect(Object.keys(entities)).toHaveLength(0)
	})

	// --- addPending / removePending / clearAllPending ---

	it('addPending creates entity in store with pending- prefixed id', () => {
		const entity = makeEntity({ id: 'ignored', type: 'image' })
		useEntityStore.getState().addPending('tc-1', entity)

		const stored = useEntityStore.getState().entities['pending-tc-1']
		expect(stored).toBeDefined()
		expect(stored.id).toBe('pending-tc-1')
		expect(stored.type).toBe('image')
	})

	it('removePending removes the pending entity by toolCallId', () => {
		const entity = makeEntity({ id: 'ignored' })
		useEntityStore.getState().addPending('tc-1', entity)
		expect(useEntityStore.getState().entities['pending-tc-1']).toBeDefined()

		useEntityStore.getState().removePending('tc-1')
		expect(useEntityStore.getState().entities['pending-tc-1']).toBeUndefined()
	})

	it('removePending is no-op for unknown toolCallId', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.getState().upsert(entity)

		useEntityStore.getState().removePending('unknown')
		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(1)
	})

	it('clearAllPending removes all pending entities but keeps real ones', () => {
		const real = makeEntity({ id: 'real-1' })
		useEntityStore.getState().upsert(real)
		useEntityStore.getState().addPending('tc-1', makeEntity({ id: 'ignored-1' }))
		useEntityStore.getState().addPending('tc-2', makeEntity({ id: 'ignored-2' }))

		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(3)

		useEntityStore.getState().clearAllPending()

		const remaining = useEntityStore.getState().entities
		expect(Object.keys(remaining)).toHaveLength(1)
		expect(remaining['real-1']).toBeDefined()
	})

	it('getVisibleEntities includes pending entities', () => {
		const entity = makeEntity({ id: 'ignored', presentation: 'card' })
		useEntityStore.getState().addPending('tc-1', entity)

		const visible = useEntityStore.getState().getVisibleEntities()
		expect(visible.some((e) => e.id === 'pending-tc-1')).toBe(true)
	})

	// --- scatterFolder ---

	it('scatterFolder sets children to card presentation with positions near folder', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				position: { x: 500, y: 300, locked: true },
				state: { child_ids: ['child-a', 'child-b'] },
			}),
		)
		useEntityStore.getState().upsert(makeEntity({ id: 'child-a', presentation: 'hidden' }))
		useEntityStore.getState().upsert(makeEntity({ id: 'child-b', presentation: 'hidden' }))

		useEntityStore.getState().scatterFolder('folder-1')

		const entities = useEntityStore.getState().entities
		expect(entities['child-a'].presentation).toBe('card')
		expect(entities['child-b'].presentation).toBe('card')
		expect(entities['child-a'].position.x).not.toBe(entities['child-b'].position.x)
		expect(entities['child-a'].position.locked).toBe(true)
		expect(entities['child-b'].position.locked).toBe(true)
	})

	it('scatterFolder archives the folder entity', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				state: { child_ids: ['child-a'] },
			}),
		)
		useEntityStore.getState().upsert(makeEntity({ id: 'child-a', presentation: 'hidden' }))

		useEntityStore.getState().scatterFolder('folder-1')

		expect(useEntityStore.getState().entities['folder-1'].archived).toBe(true)
	})

	it('scatterFolder is no-op for non-folder entity', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'card-1', presentation: 'card' }))

		useEntityStore.getState().scatterFolder('card-1')

		expect(useEntityStore.getState().entities['card-1'].archived).toBe(false)
		expect(useEntityStore.getState().entities['card-1'].presentation).toBe('card')
	})

	it('scatterFolder is no-op for missing entity', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a' }))

		useEntityStore.getState().scatterFolder('nonexistent')

		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(1)
	})

	it('scatterFolder skips children not in store', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				state: { child_ids: ['exists', 'does-not-exist'] },
			}),
		)
		useEntityStore.getState().upsert(makeEntity({ id: 'exists', presentation: 'hidden' }))

		useEntityStore.getState().scatterFolder('folder-1')

		expect(useEntityStore.getState().entities.exists.presentation).toBe('card')
		expect(useEntityStore.getState().entities['folder-1'].archived).toBe(true)
	})

	it('scatterFolder with empty child_ids archives folder', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				state: { child_ids: [] },
			}),
		)

		useEntityStore.getState().scatterFolder('folder-1')

		expect(useEntityStore.getState().entities['folder-1'].archived).toBe(true)
	})

	it('scatterFolder positions children in a grid (max 3 cols)', () => {
		const childIds = ['c1', 'c2', 'c3', 'c4']
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				position: { x: 500, y: 300, locked: true },
				state: { child_ids: childIds },
			}),
		)
		for (const id of childIds) {
			useEntityStore.getState().upsert(makeEntity({ id, presentation: 'hidden' }))
		}

		useEntityStore.getState().scatterFolder('folder-1')

		const entities = useEntityStore.getState().entities
		// First 3 share same y (row 0), 4th is on row 1
		expect(entities.c1.position.y).toBe(entities.c2.position.y)
		expect(entities.c1.position.y).toBe(entities.c3.position.y)
		expect(entities.c4.position.y).toBeGreaterThan(entities.c1.position.y)
		// Columns have increasing x
		expect(entities.c2.position.x).toBeGreaterThan(entities.c1.position.x)
		expect(entities.c3.position.x).toBeGreaterThan(entities.c2.position.x)
		// c4 wraps to col 0
		expect(entities.c4.position.x).toBe(entities.c1.position.x)
	})
})
