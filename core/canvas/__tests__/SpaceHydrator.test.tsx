import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SpaceHydrator from '@/core/canvas/SpaceHydrator'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

const mockUnsubscribe = vi.fn()
const mockStartEntitySync = vi.fn(() => mockUnsubscribe)

vi.mock('@/core/supabase/entitySync', () => ({
	startEntitySync: (...args: unknown[]) => mockStartEntitySync(...args),
}))

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

describe('SpaceHydrator', () => {
	beforeEach(() => {
		useEntityStore.setState({ entities: {}, focusedId: null })
		mockStartEntitySync.mockClear()
		mockUnsubscribe.mockClear()
	})

	afterEach(() => {
		cleanup()
	})

	it('populates entity store with provided entities on render', () => {
		const entities = [makeEntity({ id: 'a', z_index: 1 }), makeEntity({ id: 'b', z_index: 2 })]

		render(<SpaceHydrator entities={entities} />)

		const stored = useEntityStore.getState().entities
		expect(Object.keys(stored)).toHaveLength(2)
		expect(stored.a.id).toBe('a')
		expect(stored.b.id).toBe('b')
	})

	it('does not re-hydrate on re-render', () => {
		const initial = [makeEntity({ id: 'a', content: 'initial' })]

		const { rerender } = render(<SpaceHydrator entities={initial} />)

		// Agent upserts a new entity between renders
		useEntityStore.getState().upsert(makeEntity({ id: 'b', content: 'from-agent' }))

		// Re-render with different data (simulating React re-render)
		const updated = [makeEntity({ id: 'a', content: 'stale-db-data' })]
		rerender(<SpaceHydrator entities={updated} />)

		// Store should still have agent's entity, not be overwritten
		const stored = useEntityStore.getState().entities
		expect(Object.keys(stored)).toHaveLength(2)
		expect(stored.b.content).toBe('from-agent')
		expect(stored.a.content).toBe('initial')
	})

	it('starts sync subscription on mount', () => {
		render(<SpaceHydrator entities={[makeEntity({ id: 'a' })]} />)

		expect(mockStartEntitySync).toHaveBeenCalledTimes(1)
	})

	it('cleans up sync subscription on unmount', () => {
		const { unmount } = render(<SpaceHydrator entities={[makeEntity({ id: 'a' })]} />)

		expect(mockUnsubscribe).not.toHaveBeenCalled()

		unmount()

		expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
	})

	it('creates exactly one subscription even across re-renders', () => {
		const { rerender } = render(<SpaceHydrator entities={[makeEntity({ id: 'a' })]} />)

		rerender(<SpaceHydrator entities={[makeEntity({ id: 'a', content: 'updated' })]} />)
		rerender(<SpaceHydrator entities={[makeEntity({ id: 'a', content: 'updated-again' })]} />)

		expect(mockStartEntitySync).toHaveBeenCalledTimes(1)
	})
})
