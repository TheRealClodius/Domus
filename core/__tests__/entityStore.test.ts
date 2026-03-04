import { beforeEach, describe, expect, it, vi } from 'vitest'
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
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			_pendingMap: {},
			selectedIds: new Set<string>(),
			agentActiveIds: new Set<string>(),
		})
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

	it('getVisibleEntities excludes folder children (_folderId set, no _scatterOrigin)', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', presentation: 'card' }))
		useEntityStore
			.getState()
			.upsert(makeEntity({ id: 'b', presentation: 'card', state: { _folderId: 'folder-1' } }))
		// scattering child: _folderId + _scatterOrigin → visible
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'c',
				presentation: 'card',
				state: { _folderId: 'folder-1', _scatterOrigin: { x: 0, y: 0 } },
			}),
		)

		const ids = useEntityStore
			.getState()
			.getVisibleEntities()
			.map((e) => e.id)
		expect(ids).toContain('a')
		expect(ids).not.toContain('b') // folder child — hidden
		expect(ids).toContain('c') // scattering — visible
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

	it('scatterFolder phase 1: children at scatter positions as cards', () => {
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

		// Phase 1: children visible at scatter positions (not folder origin)
		const entities = useEntityStore.getState().entities
		expect(entities['child-a'].presentation).toBe('card')
		expect(entities['child-b'].presentation).toBe('card')
		expect(entities['child-a'].position.locked).toBe(true)
		expect(entities['folder-1'].state._scatterPhase).toBe('spraying')
	})

	it('scatterFolder folder archived after phases complete', () => {
		vi.useFakeTimers()
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

		// Phase 2 at T=500: folder archived (cards settled, no longer needed)
		vi.advanceTimersByTime(500)
		expect(useEntityStore.getState().entities['folder-1'].archived).toBe(true)

		vi.useRealTimers()
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
		vi.useFakeTimers()
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

		// Folder archived at phase 2 (T=500)
		vi.advanceTimersByTime(500)
		expect(useEntityStore.getState().entities['folder-1'].archived).toBe(true)

		vi.useRealTimers()
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

	it('scatterFolder positions children clustered near viewport center', () => {
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

		const vp = { width: 1280, height: 800 }
		useEntityStore.getState().scatterFolder('folder-1', vp)

		// Positions set immediately at T=0
		const entities = useEntityStore.getState().entities
		const cx = vp.width / 2
		const cy = vp.height / 2
		// All children should be within ~250px of viewport center
		for (const id of childIds) {
			const e = entities[id]
			expect(Math.abs(e.position.x + 116 - cx)).toBeLessThan(250)
			expect(Math.abs(e.position.y + 150 - cy)).toBeLessThan(250)
		}
	})

	it('scatterFolder single child lands at viewport center', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				position: { x: 50, y: 50, locked: true },
				state: { child_ids: ['only-child'] },
			}),
		)
		useEntityStore.getState().upsert(makeEntity({ id: 'only-child', presentation: 'hidden' }))

		const vp = { width: 1280, height: 800 }
		useEntityStore.getState().scatterFolder('folder-1', vp)

		const child = useEntityStore.getState().entities['only-child']
		const CARD_W = 232
		const CARD_H = 300
		expect(child.position.x).toBe(vp.width / 2 - CARD_W / 2)
		expect(child.position.y).toBe(vp.height / 2 - CARD_H / 2)
	})

	it('scatterFolder sets _scatterOrigin and _folderId on children', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				position: { x: 200, y: 100, locked: true },
				state: { child_ids: ['child-a'] },
			}),
		)
		useEntityStore.getState().upsert(makeEntity({ id: 'child-a', presentation: 'hidden' }))

		useEntityStore.getState().scatterFolder('folder-1')

		const child = useEntityStore.getState().entities['child-a']
		expect(child.state._scatterOrigin).toEqual({ x: 200, y: 100 })
		expect(child.state._folderId).toBe('folder-1')
	})

	// --- gatherEntities ---

	it('gatherEntities with < 2 entities is a no-op', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', presentation: 'card' }))

		useEntityStore.getState().gatherEntities(['a'])

		expect(useEntityStore.getState().entities.a.presentation).toBe('card')
	})

	it('gatherEntities phase 1: moves entities to centroid', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'a',
				presentation: 'card',
				position: { x: 0, y: 0, locked: true },
				size: { width: 100, height: 100 },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'b',
				presentation: 'card',
				position: { x: 200, y: 200, locked: true },
				size: { width: 100, height: 100 },
			}),
		)

		useEntityStore.getState().gatherEntities(['a', 'b'])

		// Centroid: ((0+50) + (200+50)) / 2 = 150, offset by anchor: -56, -193
		const a = useEntityStore.getState().entities.a
		const b = useEntityStore.getState().entities.b
		expect(a.position.x).toBe(94)
		expect(a.position.y).toBe(-43)
		expect(b.position.x).toBe(94)
		expect(b.position.y).toBe(-43)
	})

	it('gatherEntities phase 0: folder appears immediately with _gatherPhase approaching', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'a',
				presentation: 'card',
				position: { x: 0, y: 0, locked: true },
				size: { width: 100, height: 100 },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'b',
				presentation: 'card',
				position: { x: 200, y: 200, locked: true },
				size: { width: 100, height: 100 },
			}),
		)

		useEntityStore.getState().gatherEntities(['a', 'b'])

		// Folder exists immediately after calling gatherEntities
		const entities = useEntityStore.getState().entities
		const folder = Object.values(entities).find((e) => e.presentation === 'folder')
		expect(folder).toBeDefined()
		expect(folder!.state.child_ids).toEqual(['a', 'b'])
		expect(folder!.state._gatherPhase).toBe('approaching')
		// Centroid: ((0+50)+(200+50))/2 = 150
		expect(folder!.position.x).toBe(150)
		expect(folder!.position.y).toBe(150)
	})

	it('gatherEntities phase 2: closing at T=300', () => {
		vi.useFakeTimers()
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'a',
				presentation: 'card',
				position: { x: 0, y: 0, locked: true },
				size: { width: 100, height: 100 },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'b',
				presentation: 'card',
				position: { x: 200, y: 200, locked: true },
				size: { width: 100, height: 100 },
			}),
		)

		useEntityStore.getState().gatherEntities(['a', 'b'])

		// Before timeout: children still visible, folder has _gatherPhase
		expect(useEntityStore.getState().entities.a.presentation).toBe('card')
		expect(useEntityStore.getState().entities.b.presentation).toBe('card')

		// Phase 2 at T=300: folder switches to 'closing'
		vi.advanceTimersByTime(300)
		const closingFolder = Object.values(useEntityStore.getState().entities).find(
			(e) => e.presentation === 'folder',
		)
		expect(closingFolder!.state._gatherPhase).toBe('closing')

		vi.useRealTimers()
	})

	it('gatherEntities children excluded from visible after full timeline', () => {
		vi.useFakeTimers()
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'a',
				presentation: 'card',
				position: { x: 0, y: 0, locked: true },
				size: { width: 100, height: 100 },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'b',
				presentation: 'card',
				position: { x: 200, y: 200, locked: true },
				size: { width: 100, height: 100 },
			}),
		)

		useEntityStore.getState().gatherEntities(['a', 'b'])
		vi.advanceTimersByTime(600)

		const entities = useEntityStore.getState().entities
		// presentation stays 'card' — visibility is controlled by _folderId alone
		expect(entities.a.presentation).toBe('card')
		expect(entities.b.presentation).toBe('card')
		// but they are not visible (filtered by _folderId)
		const visibleIds = useEntityStore
			.getState()
			.getVisibleEntities()
			.map((e) => e.id)
		expect(visibleIds).not.toContain('a')
		expect(visibleIds).not.toContain('b')

		vi.useRealTimers()
	})

	it('gatherEntities _gatherPhase clears after full timeline', () => {
		vi.useFakeTimers()
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'a',
				presentation: 'card',
				position: { x: 0, y: 0, locked: true },
				size: { width: 100, height: 100 },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'b',
				presentation: 'card',
				position: { x: 200, y: 200, locked: true },
				size: { width: 100, height: 100 },
			}),
		)

		useEntityStore.getState().gatherEntities(['a', 'b'])
		vi.advanceTimersByTime(600)

		const folder = Object.values(useEntityStore.getState().entities).find(
			(e) => e.presentation === 'folder',
		)
		expect(folder).toBeDefined()
		expect(folder?.state._gatherPhase).toBeUndefined()

		vi.useRealTimers()
	})

	it('gatherEntities sets _folderId on children', () => {
		vi.useFakeTimers()
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'a',
				presentation: 'card',
				position: { x: 0, y: 0, locked: true },
				size: { width: 100, height: 100 },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'b',
				presentation: 'card',
				position: { x: 200, y: 200, locked: true },
				size: { width: 100, height: 100 },
			}),
		)

		useEntityStore.getState().gatherEntities(['a', 'b'])
		vi.advanceTimersByTime(600)

		const entities = useEntityStore.getState().entities
		const folder = Object.values(entities).find((e) => e.presentation === 'folder')
		expect(entities.a.state._folderId).toBe(folder?.id)
		expect(entities.b.state._folderId).toBe(folder?.id)

		vi.useRealTimers()
	})

	it('gatherEntities folder has correct position, presentation, and z_index', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'a',
				presentation: 'card',
				position: { x: 0, y: 0, locked: true },
				size: { width: 100, height: 100 },
				z_index: 3,
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'b',
				presentation: 'card',
				position: { x: 200, y: 200, locked: true },
				size: { width: 100, height: 100 },
				z_index: 5,
			}),
		)

		useEntityStore.getState().gatherEntities(['a', 'b'])

		const folder = Object.values(useEntityStore.getState().entities).find(
			(e) => e.presentation === 'folder',
		)
		expect(folder).toBeDefined()
		// Centroid: ((0+50)+(200+50))/2 = 150
		expect(folder!.position.x).toBe(150)
		expect(folder!.position.y).toBe(150)
		expect(folder!.presentation).toBe('folder')
		expect(folder!.z_index).toBeGreaterThan(5)
		expect(folder!.size).toEqual({ width: 120, height: 120 })
	})

	it('gatherEntities with targetPosition places entities and folder at target', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'a',
				presentation: 'card',
				position: { x: 0, y: 0, locked: true },
				size: { width: 100, height: 100 },
				z_index: 1,
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'b',
				presentation: 'card',
				position: { x: 200, y: 200, locked: true },
				size: { width: 100, height: 100 },
				z_index: 2,
			}),
		)

		const target = { x: 500, y: 300 }
		useEntityStore.getState().gatherEntities(['a', 'b'], target)

		// Entities move to target offset by anchor (-56, -193)
		const a = useEntityStore.getState().entities.a
		const b = useEntityStore.getState().entities.b
		expect(a.position.x).toBe(444)
		expect(a.position.y).toBe(107)
		expect(b.position.x).toBe(444)
		expect(b.position.y).toBe(107)

		// Folder placed at target immediately
		const folder = Object.values(useEntityStore.getState().entities).find(
			(e) => e.presentation === 'folder',
		)
		expect(folder).toBeDefined()
		expect(folder!.position.x).toBe(500)
		expect(folder!.position.y).toBe(300)
	})

	it('gatherEntities re-folds into existing folder when entities share _folderId', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'orig-folder',
				presentation: 'hidden',
				state: { child_ids: ['a', 'b'] },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'a',
				presentation: 'card',
				position: { x: 0, y: 0, locked: true },
				size: { width: 100, height: 100 },
				state: { _folderId: 'orig-folder' },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'b',
				presentation: 'card',
				position: { x: 200, y: 200, locked: true },
				size: { width: 100, height: 100 },
				state: { _folderId: 'orig-folder' },
			}),
		)

		useEntityStore.getState().gatherEntities(['a', 'b'])

		const entities = useEntityStore.getState().entities
		// Should reuse existing folder immediately
		expect(entities['orig-folder'].presentation).toBe('folder')
		expect(entities['orig-folder'].state.child_ids).toEqual(['a', 'b'])
		expect(entities['orig-folder'].state._gatherPhase).toBe('approaching')
		// No new folder created
		const folders = Object.values(entities).filter((e) => e.presentation === 'folder')
		expect(folders).toHaveLength(1)
	})

	// --- ejectFromFolder ---

	it('ejectFromFolder removes child from folder and sets card presentation', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				position: { x: 300, y: 200, locked: true },
				state: { child_ids: ['child-a', 'child-b'] },
			}),
		)
		useEntityStore.getState().upsert(makeEntity({ id: 'child-a', presentation: 'hidden' }))
		useEntityStore.getState().upsert(makeEntity({ id: 'child-b', presentation: 'hidden' }))

		useEntityStore.getState().ejectFromFolder('folder-1', 'child-a')

		const entities = useEntityStore.getState().entities
		expect(entities['child-a'].presentation).toBe('card')
		expect(entities['child-a'].state._scatterOrigin).toEqual({ x: 300, y: 200 })
		expect(entities['folder-1'].state.child_ids).toEqual(['child-b'])
		expect(entities['folder-1'].presentation).toBe('folder')
	})

	it('ejectFromFolder archives folder when last child ejected', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				position: { x: 300, y: 200, locked: true },
				state: { child_ids: ['child-a'] },
			}),
		)
		useEntityStore.getState().upsert(makeEntity({ id: 'child-a', presentation: 'hidden' }))

		useEntityStore.getState().ejectFromFolder('folder-1', 'child-a')

		expect(useEntityStore.getState().entities['folder-1'].archived).toBe(true)
	})

	it('ejectFromFolder places child at viewport center', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				position: { x: 50, y: 50, locked: true },
				state: { child_ids: ['child-a', 'child-b'] },
			}),
		)
		useEntityStore.getState().upsert(makeEntity({ id: 'child-a', presentation: 'hidden' }))
		useEntityStore.getState().upsert(makeEntity({ id: 'child-b', presentation: 'hidden' }))

		const vp = { width: 1280, height: 800 }
		useEntityStore.getState().ejectFromFolder('folder-1', 'child-a', vp)

		const child = useEntityStore.getState().entities['child-a']
		const CARD_W = 232
		const CARD_H = 300
		expect(child.position.x).toBe(vp.width / 2 - CARD_W / 2)
		expect(child.position.y).toBe(vp.height / 2 - CARD_H / 2)
	})

	it('ejectFromFolder clears _folderId from ejected child', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				position: { x: 300, y: 200, locked: true },
				state: { child_ids: ['child-a', 'child-b'] },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'child-a',
				presentation: 'hidden',
				state: { _folderId: 'folder-1' },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'child-b',
				presentation: 'hidden',
				state: { _folderId: 'folder-1' },
			}),
		)

		useEntityStore.getState().ejectFromFolder('folder-1', 'child-a')

		expect(useEntityStore.getState().entities['child-a'].state._folderId).toBeUndefined()
	})

	it('ejectFromFolder is no-op for non-folder entity', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'card-1', presentation: 'card' }))
		useEntityStore.getState().upsert(makeEntity({ id: 'child-a', presentation: 'hidden' }))

		useEntityStore.getState().ejectFromFolder('card-1', 'child-a')

		expect(useEntityStore.getState().entities['child-a'].presentation).toBe('hidden')
	})

	// --- selectedIds / toggleSelected / clearSelection ---

	it('toggleSelected adds and removes from selection', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a' }))

		useEntityStore.getState().toggleSelected('a')
		expect(useEntityStore.getState().selectedIds.has('a')).toBe(true)

		useEntityStore.getState().toggleSelected('a')
		expect(useEntityStore.getState().selectedIds.has('a')).toBe(false)
	})

	it('clearSelection empties the set', () => {
		useEntityStore.getState().toggleSelected('a')
		useEntityStore.getState().toggleSelected('b')
		expect(useEntityStore.getState().selectedIds.size).toBe(2)

		useEntityStore.getState().clearSelection()
		expect(useEntityStore.getState().selectedIds.size).toBe(0)
	})

	// --- agentActiveIds / setAgentActive / clearAgentActive / clearAllAgentActive ---

	it('setAgentActive adds an id to agentActiveIds', () => {
		useEntityStore.getState().setAgentActive('entity-1')
		expect(useEntityStore.getState().agentActiveIds.has('entity-1')).toBe(true)
	})

	it('setAgentActive can add multiple ids', () => {
		useEntityStore.getState().setAgentActive('a')
		useEntityStore.getState().setAgentActive('b')
		expect(useEntityStore.getState().agentActiveIds.has('a')).toBe(true)
		expect(useEntityStore.getState().agentActiveIds.has('b')).toBe(true)
	})

	it('clearAgentActive removes a specific id', () => {
		useEntityStore.getState().setAgentActive('a')
		useEntityStore.getState().setAgentActive('b')
		useEntityStore.getState().clearAgentActive('a')
		expect(useEntityStore.getState().agentActiveIds.has('a')).toBe(false)
		expect(useEntityStore.getState().agentActiveIds.has('b')).toBe(true)
	})

	it('clearAgentActive is a no-op for unknown id', () => {
		useEntityStore.getState().setAgentActive('a')
		useEntityStore.getState().clearAgentActive('nonexistent')
		expect(useEntityStore.getState().agentActiveIds.has('a')).toBe(true)
	})

	it('clearAllAgentActive empties the set', () => {
		useEntityStore.getState().setAgentActive('a')
		useEntityStore.getState().setAgentActive('b')
		useEntityStore.getState().clearAllAgentActive()
		expect(useEntityStore.getState().agentActiveIds.size).toBe(0)
	})

	it('each setAgentActive call produces a new Set reference', () => {
		const before = useEntityStore.getState().agentActiveIds
		useEntityStore.getState().setAgentActive('a')
		const after = useEntityStore.getState().agentActiveIds
		expect(after).not.toBe(before)
	})
})
