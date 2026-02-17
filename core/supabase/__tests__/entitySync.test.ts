import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

// --- Mock Supabase client ---

const mockUpsert = vi.fn()
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }))
const mockClient = { from: mockFrom }

vi.mock('@/core/supabase/client', () => ({
	getSupabaseBrowserClient: () => mockClient,
}))

// --- Helpers ---

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

describe('entitySync', () => {
	let startEntitySync: typeof import('@/core/supabase/entitySync').startEntitySync

	beforeEach(async () => {
		vi.useFakeTimers()
		useEntityStore.setState({ entities: {}, focusedId: null, _hydrating: false })
		mockUpsert.mockClear()
		mockFrom.mockClear()

		// Dynamic import so the module picks up the mock
		const mod = await import('@/core/supabase/entitySync')
		startEntitySync = mod.startEntitySync
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	// --- Hydration guard ---

	it('does not upsert when _hydrating is true', () => {
		const unsub = startEntitySync()

		// Simulate hydration: set _hydrating true, then load entities
		useEntityStore.setState({ _hydrating: true })
		useEntityStore.setState({
			entities: { a: makeEntity({ id: 'a' }) },
			_hydrating: true,
		})

		vi.advanceTimersByTime(2000)

		expect(mockUpsert).not.toHaveBeenCalled()
		unsub()
	})

	// --- Changed entities are synced ---

	it('syncs a changed entity after the fast debounce (discrete change)', () => {
		const entity = makeEntity({ id: 'a' })
		// Seed the store so the subscriber has a baseline
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync()

		// Make a discrete change (e.g. archive)
		const updated = { ...entity, archived: true, updated_at: '2026-01-02T00:00:00Z' }
		useEntityStore.setState({ entities: { a: updated } })

		// Before debounce fires, nothing should happen
		vi.advanceTimersByTime(40)
		expect(mockUpsert).not.toHaveBeenCalled()

		// After 50ms fast debounce
		vi.advanceTimersByTime(10)
		expect(mockFrom).toHaveBeenCalledWith('entities')
		expect(mockUpsert).toHaveBeenCalledWith(updated)

		unsub()
	})

	it('syncs a changed entity after the slow debounce (high-freq position change)', () => {
		const entity = makeEntity({ id: 'a', position: { x: 0, y: 0, locked: false } })
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync()

		// Change position (high-frequency field)
		const moved = { ...entity, position: { x: 100, y: 200, locked: true } }
		useEntityStore.setState({ entities: { a: moved } })

		// At 50ms, should NOT have fired (slow tier = 1000ms)
		vi.advanceTimersByTime(50)
		expect(mockUpsert).not.toHaveBeenCalled()

		// At 1000ms total, should fire
		vi.advanceTimersByTime(950)
		expect(mockUpsert).toHaveBeenCalledWith(moved)

		unsub()
	})

	it('syncs a changed entity after the slow debounce (high-freq content change)', () => {
		const entity = makeEntity({ id: 'a', content: 'original' })
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync()

		const updated = { ...entity, content: 'edited' }
		useEntityStore.setState({ entities: { a: updated } })

		vi.advanceTimersByTime(999)
		expect(mockUpsert).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)
		expect(mockUpsert).toHaveBeenCalledWith(updated)

		unsub()
	})

	// --- Unchanged entities are not synced ---

	it('does not sync entities that have not changed (same reference)', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync()

		// Set the same entities object reference for 'a' by spreading other fields
		useEntityStore.setState((state) => ({
			focusedId: 'a',
			entities: state.entities,
		}))

		vi.advanceTimersByTime(2000)
		expect(mockUpsert).not.toHaveBeenCalled()

		unsub()
	})

	// --- Debounce resets on rapid changes ---

	it('resets debounce timer on rapid successive changes', () => {
		const entity = makeEntity({ id: 'a', position: { x: 0, y: 0, locked: false } })
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync()

		// First position change
		const moved1 = { ...entity, position: { x: 10, y: 10, locked: true } }
		useEntityStore.setState({ entities: { a: moved1 } })

		// Wait 500ms (half of slow debounce)
		vi.advanceTimersByTime(500)
		expect(mockUpsert).not.toHaveBeenCalled()

		// Second position change — resets the 1000ms timer
		const moved2 = { ...entity, position: { x: 20, y: 20, locked: true } }
		useEntityStore.setState({ entities: { a: moved2 } })

		// Another 500ms — 1000ms since first, but only 500ms since second
		vi.advanceTimersByTime(500)
		expect(mockUpsert).not.toHaveBeenCalled()

		// 500ms more — now 1000ms since second change
		vi.advanceTimersByTime(500)
		expect(mockUpsert).toHaveBeenCalledTimes(1)
		expect(mockUpsert).toHaveBeenCalledWith(moved2)

		unsub()
	})

	// --- New entity (no previous) uses fast debounce ---

	it('uses fast debounce for a newly added entity', () => {
		useEntityStore.setState({ entities: {}, _hydrating: false })

		const unsub = startEntitySync()

		const entity = makeEntity({ id: 'new-1' })
		useEntityStore.setState({ entities: { 'new-1': entity } })

		vi.advanceTimersByTime(49)
		expect(mockUpsert).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)
		expect(mockUpsert).toHaveBeenCalledWith(entity)

		unsub()
	})

	// --- Unsubscribe stops listening ---

	it('unsubscribe stops listening and clears pending timers', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync()

		// Trigger a change
		const updated = { ...entity, archived: true }
		useEntityStore.setState({ entities: { a: updated } })

		// Unsubscribe before debounce fires
		unsub()

		vi.advanceTimersByTime(2000)

		// The pending timer should have been cleared
		expect(mockUpsert).not.toHaveBeenCalled()

		// Further changes should not trigger upserts
		const updated2 = { ...entity, content: 'after-unsub' }
		useEntityStore.setState({ entities: { a: updated2 } })

		vi.advanceTimersByTime(2000)
		expect(mockUpsert).not.toHaveBeenCalled()
	})
})
