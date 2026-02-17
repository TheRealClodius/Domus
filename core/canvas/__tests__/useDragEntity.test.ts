import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

// Capture the drag handler passed to useDrag so we can invoke it directly.
let capturedHandler: (state: Record<string, unknown>) => void
vi.mock('@use-gesture/react', () => ({
	useDrag: (handler: (state: Record<string, unknown>) => void) => {
		capturedHandler = handler
		return () => ({})
	},
}))

// Imported AFTER the mock so the mock is in place.
const { useDragEntity } = await import('@/core/canvas/useDragEntity')

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'e1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'window',
		position: { x: 100, y: 200, locked: false },
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

function fire(overrides: Record<string, unknown> = {}) {
	capturedHandler({
		first: false,
		last: false,
		movement: [0, 0],
		event: { stopPropagation: vi.fn() },
		...overrides,
	})
}

describe('useDragEntity', () => {
	beforeEach(() => {
		useEntityStore.setState({ entities: {}, focusedId: null })
		document.body.style.cursor = ''
	})

	it('does not update position when entity is missing on first event', () => {
		renderHook(() => useDragEntity('nonexistent'))

		act(() => {
			fire({ first: true, movement: [10, 20] })
		})

		// No entity exists — store should remain empty, no crash
		expect(Object.keys(useEntityStore.getState().entities)).toHaveLength(0)
	})

	it('does not snap to origin when entity is missing', () => {
		// Insert an entity, then drag a DIFFERENT id that doesn't exist.
		useEntityStore.getState().upsert(makeEntity({ id: 'e1' }))
		renderHook(() => useDragEntity('nonexistent'))

		act(() => {
			fire({ first: true, movement: [0, 0] })
		})
		act(() => {
			fire({ first: false, movement: [50, 50] })
		})

		// e1 should be untouched — no position update to {0,0}+delta
		const e1 = useEntityStore.getState().entities.e1
		expect(e1.position.x).toBe(100)
		expect(e1.position.y).toBe(200)
	})

	it('captures start position and commits on release', () => {
		useEntityStore
			.getState()
			.upsert(makeEntity({ id: 'e1', position: { x: 100, y: 200, locked: false } }))
		renderHook(() => useDragEntity('e1'))

		act(() => fire({ first: true, movement: [0, 0] }))
		// Intermediate movement — store NOT updated yet
		act(() => fire({ movement: [30, -10] }))
		expect(useEntityStore.getState().entities.e1.position.x).toBe(100)

		// Release — store commits final position
		act(() => fire({ last: true, movement: [30, -10] }))

		const entity = useEntityStore.getState().entities.e1
		expect(entity.position.x).toBe(130)
		expect(entity.position.y).toBe(190)
	})

	it('resets startPos on last event so next gesture starts fresh', () => {
		useEntityStore
			.getState()
			.upsert(makeEntity({ id: 'e1', position: { x: 100, y: 200, locked: false } }))
		renderHook(() => useDragEntity('e1'))

		// First gesture
		act(() => fire({ first: true, movement: [0, 0] }))
		act(() => fire({ last: true, movement: [50, 50] }))

		// Position after first gesture
		expect(useEntityStore.getState().entities.e1.position.x).toBe(150)
		expect(useEntityStore.getState().entities.e1.position.y).toBe(250)

		// Between gestures — a stray event should be ignored (startPos is null)
		act(() => fire({ first: false, movement: [999, 999] }))

		// Position unchanged
		expect(useEntityStore.getState().entities.e1.position.x).toBe(150)
		expect(useEntityStore.getState().entities.e1.position.y).toBe(250)
	})

	it('second gesture captures fresh start position', () => {
		useEntityStore
			.getState()
			.upsert(makeEntity({ id: 'e1', position: { x: 100, y: 200, locked: false } }))
		renderHook(() => useDragEntity('e1'))

		// First gesture: move to (150, 250)
		act(() => fire({ first: true, movement: [0, 0] }))
		act(() => fire({ last: true, movement: [50, 50] }))

		// Second gesture: commit on release
		act(() => fire({ first: true, movement: [0, 0] }))
		act(() => fire({ last: true, movement: [10, 10] }))

		const entity = useEntityStore.getState().entities.e1
		expect(entity.position.x).toBe(160)
		expect(entity.position.y).toBe(260)
	})

	it('sets focused on drag start', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'e1' }))
		renderHook(() => useDragEntity('e1'))

		act(() => fire({ first: true, movement: [0, 0] }))

		expect(useEntityStore.getState().focusedId).toBe('e1')
	})

	it('does not update store position during intermediate movements', () => {
		useEntityStore
			.getState()
			.upsert(makeEntity({ id: 'e1', position: { x: 100, y: 200, locked: false } }))
		renderHook(() => useDragEntity('e1'))

		act(() => fire({ first: true, movement: [0, 0] }))
		act(() => fire({ movement: [50, 50] }))
		act(() => fire({ movement: [80, 80] }))

		// Position unchanged — only commits on last
		expect(useEntityStore.getState().entities.e1.position.x).toBe(100)
		expect(useEntityStore.getState().entities.e1.position.y).toBe(200)
	})

	it('sets body cursor to grabbing during drag', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'e1' }))
		renderHook(() => useDragEntity('e1'))

		act(() => fire({ first: true, movement: [0, 0] }))
		expect(document.body.style.cursor).toBe('grabbing')

		act(() => fire({ last: true, movement: [10, 10] }))
		expect(document.body.style.cursor).toBe('')
	})
})
