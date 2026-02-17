import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

// --- Mock Supabase client ---

const mockUpsert = vi.fn().mockReturnValue(Promise.resolve({ error: null }))
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }))

const cdcHandlers: Array<(payload: unknown) => void> = []
const mockChannel: Record<string, ReturnType<typeof vi.fn>> = {}
mockChannel.on = vi
	.fn()
	.mockImplementation((_type: string, _opts: unknown, handler: (p: unknown) => void) => {
		cdcHandlers.push(handler)
		return mockChannel
	})
mockChannel.subscribe = vi.fn().mockReturnValue(mockChannel)
const mockRemoveChannel = vi.fn()

const mockClient = {
	from: mockFrom,
	channel: vi.fn().mockReturnValue(mockChannel),
	removeChannel: mockRemoveChannel,
}

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
		useEntityStore.setState({
			entities: {},
			focusedId: null,
			_hydrating: false,
			_fromCDC: false,
		})
		mockUpsert.mockClear()
		mockFrom.mockClear()
		mockClient.channel.mockClear()
		mockChannel.on.mockClear()
		mockChannel.subscribe.mockClear()
		mockRemoveChannel.mockClear()
		cdcHandlers.length = 0

		// Dynamic import so the module picks up the mock
		const mod = await import('@/core/supabase/entitySync')
		startEntitySync = mod.startEntitySync
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	// --- Hydration guard ---

	it('does not upsert when _hydrating is true', () => {
		const unsub = startEntitySync('space-1')

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

		const unsub = startEntitySync('space-1')

		// Make a discrete change (e.g. archive)
		const updated = {
			...entity,
			archived: true,
			updated_at: '2026-01-02T00:00:00Z',
		}
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
		const entity = makeEntity({
			id: 'a',
			position: { x: 0, y: 0, locked: false },
		})
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync('space-1')

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

		const unsub = startEntitySync('space-1')

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

		const unsub = startEntitySync('space-1')

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
		const entity = makeEntity({
			id: 'a',
			position: { x: 0, y: 0, locked: false },
		})
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync('space-1')

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

		const unsub = startEntitySync('space-1')

		const entity = makeEntity({ id: 'new-1' })
		useEntityStore.setState({ entities: { 'new-1': entity } })

		vi.advanceTimersByTime(49)
		expect(mockUpsert).not.toHaveBeenCalled()

		vi.advanceTimersByTime(1)
		expect(mockUpsert).toHaveBeenCalledWith(entity)

		unsub()
	})

	// --- Unsubscribe stops listening ---

	it('unsubscribe flushes pending changes and stops listening', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync('space-1')

		// Trigger a change
		const updated = { ...entity, archived: true }
		useEntityStore.setState({ entities: { a: updated } })

		// Unsubscribe before debounce fires — should flush immediately
		unsub()

		expect(mockUpsert).toHaveBeenCalledWith(updated)
		mockUpsert.mockClear()

		// Further changes should not trigger upserts
		const updated2 = { ...entity, content: 'after-unsub' }
		useEntityStore.setState({ entities: { a: updated2 } })

		vi.advanceTimersByTime(2000)
		expect(mockUpsert).not.toHaveBeenCalled()
	})

	// --- CDC subscription tests ---

	it('subscribes to postgres_changes on entities filtered by space_id', () => {
		const unsub = startEntitySync('space-1')

		expect(mockClient.channel).toHaveBeenCalledWith('entities:space-1')
		expect(mockChannel.on).toHaveBeenCalledWith(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'entities',
				filter: 'space_id=eq.space-1',
			},
			expect.any(Function),
		)
		expect(mockChannel.subscribe).toHaveBeenCalled()

		unsub()
	})

	it('upserts entity on CDC INSERT event', () => {
		const unsub = startEntitySync('space-1')

		const entity = makeEntity({ id: 'cdc-1' })
		const handler = cdcHandlers[0]
		handler({ eventType: 'INSERT', new: entity })

		expect(useEntityStore.getState().entities['cdc-1']).toEqual(entity)
		// _fromCDC should be reset after the operation
		expect(useEntityStore.getState()._fromCDC).toBe(false)

		unsub()
	})

	it('updates entity on CDC UPDATE event', () => {
		// Seed initial entity
		const entity = makeEntity({ id: 'cdc-2', content: 'original' })
		useEntityStore.setState({
			entities: { 'cdc-2': entity },
			_hydrating: false,
		})

		const unsub = startEntitySync('space-1')

		const updated = { ...entity, content: 'updated-by-agent' }
		const handler = cdcHandlers[0]
		handler({ eventType: 'UPDATE', new: updated })

		expect(useEntityStore.getState().entities['cdc-2'].content).toBe('updated-by-agent')

		unsub()
	})

	it('removes entity on CDC DELETE event', () => {
		const entity = makeEntity({ id: 'cdc-3' })
		useEntityStore.setState({
			entities: { 'cdc-3': entity },
			_hydrating: false,
		})

		const unsub = startEntitySync('space-1')

		const handler = cdcHandlers[0]
		handler({ eventType: 'DELETE', old: { id: 'cdc-3' } })

		expect(useEntityStore.getState().entities['cdc-3']).toBeUndefined()

		unsub()
	})

	it('does NOT trigger DB upsert when change came from CDC', () => {
		useEntityStore.setState({ entities: {}, _hydrating: false })

		const unsub = startEntitySync('space-1')

		// Simulate CDC INSERT — this modifies the store but should not trigger upsert
		const entity = makeEntity({ id: 'cdc-4' })
		const handler = cdcHandlers[0]
		handler({ eventType: 'INSERT', new: entity })

		// Advance timers well past both debounce tiers
		vi.advanceTimersByTime(2000)

		expect(mockUpsert).not.toHaveBeenCalled()

		unsub()
	})

	it('cleanup removes the Supabase channel', () => {
		const unsub = startEntitySync('space-1')
		unsub()

		expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel)
	})

	// --- Error logging ---

	it('logs error when upsert fails', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		mockUpsert.mockReturnValueOnce(
			Promise.resolve({ error: { message: 'invalid input syntax for type uuid' } }),
		)

		const entity = makeEntity({ id: 'bad-id' })
		useEntityStore.setState({ entities: {}, _hydrating: false })

		const unsub = startEntitySync('space-1')

		useEntityStore.setState({ entities: { 'bad-id': entity } })
		vi.advanceTimersByTime(50)

		// Let the promise resolve
		await vi.advanceTimersByTimeAsync(0)

		expect(consoleSpy).toHaveBeenCalledWith(
			'[entitySync] upsert failed',
			'bad-id',
			'invalid input syntax for type uuid',
		)

		consoleSpy.mockRestore()
		unsub()
	})

	// --- beforeunload flush ---

	it('flushes pending changes on beforeunload', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync('space-1')

		const updated = { ...entity, content: 'unsaved' }
		useEntityStore.setState({ entities: { a: updated } })

		// Fire beforeunload before debounce completes
		window.dispatchEvent(new Event('beforeunload'))

		expect(mockUpsert).toHaveBeenCalledWith(updated)

		unsub()
	})
})
