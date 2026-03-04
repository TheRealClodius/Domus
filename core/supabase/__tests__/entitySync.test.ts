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

const mockAuthUnsubscribe = vi.fn()
const mockGetSession = vi.fn().mockResolvedValue({
	data: { session: { access_token: 'test-token' } },
})
const mockSetAuth = vi.fn()
const mockOnAuthStateChange = vi.fn().mockReturnValue({
	data: { subscription: { unsubscribe: mockAuthUnsubscribe } },
})

const mockClient = {
	from: mockFrom,
	channel: vi.fn().mockReturnValue(mockChannel),
	removeChannel: mockRemoveChannel,
	auth: {
		getSession: mockGetSession,
		onAuthStateChange: mockOnAuthStateChange,
	},
	realtime: {
		setAuth: mockSetAuth,
	},
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
		presentation: 'card',
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

/** Flush microtasks so the async initCDC() completes and populates cdcHandlers. */
async function flushCDCInit() {
	await vi.advanceTimersByTimeAsync(0)
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
		mockGetSession.mockClear()
		mockSetAuth.mockClear()
		mockOnAuthStateChange.mockClear()
		mockAuthUnsubscribe.mockClear()
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

		// Make a discrete change (non-high-freq, non-archive)
		const updated = {
			...entity,
			summary: 'changed summary',
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

		// Trigger a discrete change (goes through debounce, not immediate archive sync)
		const updated = { ...entity, summary: 'pending change' }
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

	// --- Archive syncs immediately ---

	it('syncs archive immediately without debounce', () => {
		const entity = makeEntity({ id: 'a' })
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync('space-1')

		// Archive the entity
		const archived = { ...entity, archived: true }
		useEntityStore.setState({ entities: { a: archived } })

		// Should sync immediately — no timer needed
		expect(mockFrom).toHaveBeenCalledWith('entities')
		expect(mockUpsert).toHaveBeenCalledWith(archived)

		unsub()
	})

	// --- Building-state skip (Bug 2 fix) ---

	it('does not sync entities with building state to prevent overwriting builder', () => {
		const entity = makeEntity({
			id: 'a',
			state: { building: true, icon: 'hammer', name: 'Test App' },
		})
		useEntityStore.setState({ entities: { a: entity }, _hydrating: false })

		const unsub = startEntitySync('space-1')

		// Mutate the entity — normally this would trigger a sync
		const updated = { ...entity, summary: 'changed summary' }
		useEntityStore.setState({ entities: { a: updated } })

		vi.advanceTimersByTime(2000)

		// Should NOT have synced because building is true
		expect(mockUpsert).not.toHaveBeenCalled()

		unsub()
	})

	// --- CDC subscription tests ---

	it('subscribes to postgres_changes on entities filtered by space_id', async () => {
		const unsub = startEntitySync('space-1')
		await flushCDCInit()

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

	it('sets realtime auth from session before subscribing', async () => {
		const unsub = startEntitySync('space-1')
		await flushCDCInit()

		expect(mockGetSession).toHaveBeenCalled()
		expect(mockSetAuth).toHaveBeenCalledWith('test-token')

		unsub()
	})

	it('listens for auth state changes to keep realtime auth in sync', () => {
		const unsub = startEntitySync('space-1')

		expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function))

		unsub()
	})

	it('upserts entity on CDC INSERT event', async () => {
		const unsub = startEntitySync('space-1')
		await flushCDCInit()

		const entity = makeEntity({ id: 'cdc-1' })
		const handler = cdcHandlers[0]
		handler({ eventType: 'INSERT', new: entity })

		expect(useEntityStore.getState().entities['cdc-1']).toEqual(entity)
		// _fromCDC should be reset after the operation
		expect(useEntityStore.getState()._fromCDC).toBe(false)

		unsub()
	})

	it('updates entity on CDC UPDATE event', async () => {
		// Seed initial entity
		const entity = makeEntity({ id: 'cdc-2', content: 'original' })
		useEntityStore.setState({
			entities: { 'cdc-2': entity },
			_hydrating: false,
		})

		const unsub = startEntitySync('space-1')
		await flushCDCInit()

		const updated = { ...entity, content: 'updated-by-agent' }
		const handler = cdcHandlers[0]
		handler({ eventType: 'UPDATE', new: updated })

		expect(useEntityStore.getState().entities['cdc-2'].content).toBe('updated-by-agent')

		unsub()
	})

	it('removes entity on CDC DELETE event', async () => {
		const entity = makeEntity({ id: 'cdc-3' })
		useEntityStore.setState({
			entities: { 'cdc-3': entity },
			_hydrating: false,
		})

		const unsub = startEntitySync('space-1')
		await flushCDCInit()

		const handler = cdcHandlers[0]
		handler({ eventType: 'DELETE', old: { id: 'cdc-3' } })

		expect(useEntityStore.getState().entities['cdc-3']).toBeUndefined()

		unsub()
	})

	it('does NOT trigger DB upsert when change came from CDC', async () => {
		useEntityStore.setState({ entities: {}, _hydrating: false })

		const unsub = startEntitySync('space-1')
		await flushCDCInit()

		// Simulate CDC INSERT — this modifies the store but should not trigger upsert
		const entity = makeEntity({ id: 'cdc-4' })
		const handler = cdcHandlers[0]
		handler({ eventType: 'INSERT', new: entity })

		// Advance timers well past both debounce tiers
		vi.advanceTimersByTime(2000)

		expect(mockUpsert).not.toHaveBeenCalled()

		unsub()
	})

	it('cleanup removes the Supabase channel and auth subscription', async () => {
		const unsub = startEntitySync('space-1')
		await flushCDCInit()

		unsub()

		expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel)
		expect(mockAuthUnsubscribe).toHaveBeenCalled()
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

	// --- CDC coercion ---

	it('coerces invalid presentation from CDC and writes correction back to DB', async () => {
		useEntityStore.setState({ entities: {}, _hydrating: false })

		const unsub = startEntitySync('space-1')
		await flushCDCInit()

		// Agent wrote presentation:'window' for a note — invalid
		const badEntity = makeEntity({ id: 'bad-pres', presentation: 'window' })
		const handler = cdcHandlers[0]
		handler({ eventType: 'INSERT', new: badEntity })

		// Store should contain the corrected entity
		expect(useEntityStore.getState().entities['bad-pres'].presentation).toBe('card')

		// A write-back upsert should have fired to correct the DB
		expect(mockUpsert).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'bad-pres', presentation: 'card' }),
		)

		unsub()
	})

	it('does not write back to DB when CDC presentation is already valid', async () => {
		useEntityStore.setState({ entities: {}, _hydrating: false })

		const unsub = startEntitySync('space-1')
		await flushCDCInit()

		// Valid: note with card presentation
		const goodEntity = makeEntity({ id: 'good-pres', presentation: 'card' })
		const handler = cdcHandlers[0]
		handler({ eventType: 'INSERT', new: goodEntity })

		// No write-back needed
		expect(mockUpsert).not.toHaveBeenCalled()

		unsub()
	})

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
