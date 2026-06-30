import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeEntity, resetAllStores } from '@/core/__tests__/storeTestHelpers'
import { useEntityStore } from '@/core/stores/entityStore'
import { useSpatialStore } from '@/core/stores/spatialStore'

describe('spatialStore', () => {
	beforeEach(() => {
		resetAllStores()
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

		useSpatialStore.getState().scatterFolder('folder-1')

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

		useSpatialStore.getState().scatterFolder('folder-1')

		// Phase 2 at T=500: folder archived (cards settled, no longer needed)
		vi.advanceTimersByTime(500)
		expect(useEntityStore.getState().entities['folder-1'].archived).toBe(true)

		vi.useRealTimers()
	})

	it('scatterFolder is no-op for non-folder entity', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'card-1', presentation: 'card' }))

		useSpatialStore.getState().scatterFolder('card-1')

		expect(useEntityStore.getState().entities['card-1'].archived).toBe(false)
		expect(useEntityStore.getState().entities['card-1'].presentation).toBe('card')
	})

	it('scatterFolder is no-op for missing entity', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a' }))

		useSpatialStore.getState().scatterFolder('nonexistent')

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

		useSpatialStore.getState().scatterFolder('folder-1')

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

		useSpatialStore.getState().scatterFolder('folder-1')

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
		useSpatialStore.getState().scatterFolder('folder-1', vp)

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
		useSpatialStore.getState().scatterFolder('folder-1', vp)

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

		useSpatialStore.getState().scatterFolder('folder-1')

		const child = useEntityStore.getState().entities['child-a']
		expect(child.state._scatterOrigin).toEqual({ x: 200, y: 100 })
		expect(child.state._folderId).toBe('folder-1')
	})

	// --- gatherEntities ---

	it('gatherEntities with < 2 entities is a no-op', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a', presentation: 'card' }))

		useSpatialStore.getState().gatherEntities(['a'])

		expect(useEntityStore.getState().entities.a.presentation).toBe('card')
	})

	it('gatherEntities with explicitFolderId and 1 entity nests the entity', () => {
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'folder-1',
				presentation: 'folder',
				state: { child_ids: [] },
				position: { x: 100, y: 100, locked: false },
				size: { width: 120, height: 120 },
			}),
		)
		useEntityStore.getState().upsert(
			makeEntity({
				id: 'img-1',
				presentation: 'card',
				position: { x: 200, y: 200, locked: false },
				size: { width: 100, height: 100 },
			}),
		)

		useSpatialStore.getState().gatherEntities(['img-1'], undefined, 'folder-1')

		const folder = useEntityStore.getState().entities['folder-1']
		expect(folder.state.child_ids).toContain('img-1')
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

		useSpatialStore.getState().gatherEntities(['a', 'b'])

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

		useSpatialStore.getState().gatherEntities(['a', 'b'])

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

		useSpatialStore.getState().gatherEntities(['a', 'b'])

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

		useSpatialStore.getState().gatherEntities(['a', 'b'])
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

		useSpatialStore.getState().gatherEntities(['a', 'b'])
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

		useSpatialStore.getState().gatherEntities(['a', 'b'])
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

		useSpatialStore.getState().gatherEntities(['a', 'b'])

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
		useSpatialStore.getState().gatherEntities(['a', 'b'], target)

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

		useSpatialStore.getState().gatherEntities(['a', 'b'])

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

		useSpatialStore.getState().ejectFromFolder('folder-1', 'child-a')

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

		useSpatialStore.getState().ejectFromFolder('folder-1', 'child-a')

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
		useSpatialStore.getState().ejectFromFolder('folder-1', 'child-a', vp)

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

		useSpatialStore.getState().ejectFromFolder('folder-1', 'child-a')

		expect(useEntityStore.getState().entities['child-a'].state._folderId).toBeUndefined()
	})

	it('ejectFromFolder is no-op for non-folder entity', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'card-1', presentation: 'card' }))
		useEntityStore.getState().upsert(makeEntity({ id: 'child-a', presentation: 'hidden' }))

		useSpatialStore.getState().ejectFromFolder('card-1', 'child-a')

		expect(useEntityStore.getState().entities['child-a'].presentation).toBe('hidden')
	})

	// --- selectedIds / toggleSelected / clearSelection ---

	it('toggleSelected adds and removes from selection', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'a' }))

		useSpatialStore.getState().toggleSelected('a')
		expect(useSpatialStore.getState().selectedIds.has('a')).toBe(true)

		useSpatialStore.getState().toggleSelected('a')
		expect(useSpatialStore.getState().selectedIds.has('a')).toBe(false)
	})

	it('clearSelection empties the set', () => {
		useSpatialStore.getState().toggleSelected('a')
		useSpatialStore.getState().toggleSelected('b')
		expect(useSpatialStore.getState().selectedIds.size).toBe(2)

		useSpatialStore.getState().clearSelection()
		expect(useSpatialStore.getState().selectedIds.size).toBe(0)
	})

})
