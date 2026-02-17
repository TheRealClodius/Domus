import { act, cleanup, renderHook } from '@testing-library/react'
import { createRef, type MutableRefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'
import { useCalendarEntitySync } from '../useCalendarEntitySync'

function makeCalendarEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'evt-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'calendar_event',
		presentation: 'hidden',
		position: { x: 0, y: 0, locked: false },
		size: { width: 0, height: 0 },
		z_index: 0,
		content: '',
		state: {
			title: 'Team sync',
			start: '2026-02-17T10:00:00Z',
			end: '2026-02-17T11:00:00Z',
			all_day: false,
		},
		summary: 'Team sync',
		created_by: 'agent',
		archived: false,
		created_at: '2026-02-17T10:00:00Z',
		updated_at: '2026-02-17T10:00:00Z',
		...overrides,
	}
}

function makeSyncingRef(value = false): MutableRefObject<boolean> {
	const ref = createRef<boolean>() as MutableRefObject<boolean>
	ref.current = value
	return ref
}

describe('useCalendarEntitySync', () => {
	const originalFetch = globalThis.fetch
	let mockFetch: Mock

	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ id: 'gcal-new' }), { status: 200 }))
		globalThis.fetch = mockFetch
		useEntityStore.setState({ entities: {} })
	})

	afterEach(() => {
		cleanup()
		globalThis.fetch = originalFetch
	})

	it('POSTs agent-created entity to Google and sets gcal_id', async () => {
		const entity = makeCalendarEntity()
		useEntityStore.setState({ entities: { [entity.id]: entity } })

		renderHook(() => useCalendarEntitySync(true, makeSyncingRef()))

		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledOnce()
		})

		const [url, options] = mockFetch.mock.calls[0]
		expect(url).toBe('/api/google-calendar/events')
		expect(options.method).toBe('POST')
		const body = JSON.parse(options.body)
		expect(body.title).toBe('Team sync')
		expect(body.start).toBe('2026-02-17T10:00:00Z')
		expect(body.end).toBe('2026-02-17T11:00:00Z')

		// Should set gcal_id on entity after POST
		await vi.waitFor(() => {
			const updated = useEntityStore.getState().entities[entity.id]
			expect(updated?.state.gcal_id).toBe('gcal-new')
		})
	})

	it('does not sync when disconnected', () => {
		const entity = makeCalendarEntity()
		useEntityStore.setState({ entities: { [entity.id]: entity } })

		renderHook(() => useCalendarEntitySync(false, makeSyncingRef()))

		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('does not sync when inbound sync is active', () => {
		const entity = makeCalendarEntity()
		useEntityStore.setState({ entities: { [entity.id]: entity } })

		renderHook(() => useCalendarEntitySync(true, makeSyncingRef(true)))

		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('maps string attendees to { email } objects', async () => {
		const entity = makeCalendarEntity({
			state: {
				title: 'With guests',
				start: '2026-02-17T10:00:00Z',
				end: '2026-02-17T11:00:00Z',
				all_day: false,
				attendees: ['alice@example.com', 'bob@example.com'],
			},
		})
		useEntityStore.setState({ entities: { [entity.id]: entity } })

		renderHook(() => useCalendarEntitySync(true, makeSyncingRef()))

		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledOnce()
		})

		const body = JSON.parse(mockFetch.mock.calls[0][1].body)
		expect(body.attendees).toEqual([{ email: 'alice@example.com' }, { email: 'bob@example.com' }])
	})

	it('skips pending entities (agent stream placeholders)', () => {
		const entity = makeCalendarEntity({ id: 'pending-toolu_01VvWXpeEXpXdjaKdvnkpGxH' })
		useEntityStore.setState({ entities: { [entity.id]: entity } })

		renderHook(() => useCalendarEntitySync(true, makeSyncingRef()))

		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('skips archived entities without gcal_id', () => {
		const entity = makeCalendarEntity({ archived: true })
		useEntityStore.setState({ entities: { [entity.id]: entity } })

		renderHook(() => useCalendarEntitySync(true, makeSyncingRef()))

		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('skips user-created entities (only syncs agent-created)', () => {
		const entity = makeCalendarEntity({ created_by: 'user' })
		useEntityStore.setState({ entities: { [entity.id]: entity } })

		renderHook(() => useCalendarEntitySync(true, makeSyncingRef()))

		expect(mockFetch).not.toHaveBeenCalled()
	})

	it('DELETEs from Google when entity with gcal_id is archived', async () => {
		const entity = makeCalendarEntity({
			archived: true,
			state: {
				title: 'Deleted meeting',
				start: '2026-02-17T10:00:00Z',
				end: '2026-02-17T11:00:00Z',
				all_day: false,
				gcal_id: 'google-event-123',
			},
		})
		useEntityStore.setState({ entities: { [entity.id]: entity } })

		renderHook(() => useCalendarEntitySync(true, makeSyncingRef()))

		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledOnce()
		})

		const [url, options] = mockFetch.mock.calls[0]
		expect(url).toBe('/api/google-calendar/events/google-event-123')
		expect(options.method).toBe('DELETE')
	})

	it('PATCHes Google when entity with gcal_id changes', async () => {
		const entity = makeCalendarEntity({
			state: {
				title: 'Original title',
				start: '2026-02-17T10:00:00Z',
				end: '2026-02-17T11:00:00Z',
				all_day: false,
				gcal_id: 'google-event-456',
			},
		})
		useEntityStore.setState({ entities: { [entity.id]: entity } })

		const syncingRef = makeSyncingRef()
		const { rerender } = renderHook(() => useCalendarEntitySync(true, syncingRef))

		// First render records the snapshot — no fetch
		expect(mockFetch).not.toHaveBeenCalled()

		// Simulate user/agent changing the title
		act(() => {
			useEntityStore.setState({
				entities: {
					[entity.id]: {
						...entity,
						state: { ...entity.state, gcal_id: 'google-event-456', title: 'Updated title' },
						updated_at: new Date().toISOString(),
					},
				},
			})
		})
		rerender()

		await vi.waitFor(() => {
			expect(mockFetch).toHaveBeenCalledOnce()
		})

		const [url, options] = mockFetch.mock.calls[0]
		expect(url).toBe('/api/google-calendar/events/google-event-456')
		expect(options.method).toBe('PATCH')
		const body = JSON.parse(options.body)
		expect(body.title).toBe('Updated title')
	})

	it('does not PATCH when gcal_id entity state has not changed', () => {
		const entity = makeCalendarEntity({
			state: {
				title: 'Stable event',
				start: '2026-02-17T10:00:00Z',
				end: '2026-02-17T11:00:00Z',
				all_day: false,
				gcal_id: 'google-event-789',
			},
		})
		useEntityStore.setState({ entities: { [entity.id]: entity } })

		const syncingRef = makeSyncingRef()
		const { rerender } = renderHook(() => useCalendarEntitySync(true, syncingRef))

		// First render records snapshot
		expect(mockFetch).not.toHaveBeenCalled()

		// Re-render with same state
		rerender()
		expect(mockFetch).not.toHaveBeenCalled()
	})
})
