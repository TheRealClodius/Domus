import { useEntityStore } from '@/core/entityStore'
import { getSupabaseBrowserClient } from '@/core/supabase/client'
import type { Entity } from '@/lib/types'

/** Fields that trigger the slow debounce tier (high-frequency updates like drag/type). */
const HIGH_FREQ_FIELDS: (keyof Entity)[] = ['position', 'size', 'content', 'state']

const SLOW_DEBOUNCE_MS = 1000
const FAST_DEBOUNCE_MS = 50

/**
 * Determine whether a change is high-frequency (position/size/content/state differ)
 * or discrete (everything else). Returns the appropriate debounce delay.
 */
function debounceDelay(prev: Entity, curr: Entity): number {
	for (const field of HIGH_FREQ_FIELDS) {
		if (prev[field] !== curr[field]) return SLOW_DEBOUNCE_MS
	}
	return FAST_DEBOUNCE_MS
}

/**
 * Subscribe to the entity store and persist changes to Supabase.
 *
 * Two-way sync:
 * 1. **DB -> Client (CDC)**: Listens for `postgres_changes` on the `entities`
 *    table filtered by `space_id`. Inbound changes set `_fromCDC` so the
 *    client-to-DB subscriber knows to skip the write-back.
 * 2. **Client -> DB**: Diffs previous vs current entities using referential
 *    equality. Debounces upserts per-entity with tier-based delays. Skips
 *    writes while `_hydrating` or `_fromCDC` is true.
 *
 * Returns an unsubscribe function that stops listening and clears pending timers.
 */
export function startEntitySync(spaceId: string): () => void {
	const timers = new Map<string, ReturnType<typeof setTimeout>>()
	let previousEntities: Record<string, Entity> = useEntityStore.getState().entities

	// --- CDC subscription: DB → client ---
	const supabase = getSupabaseBrowserClient()
	const channel = supabase
		.channel(`entities:${spaceId}`)
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'entities',
				filter: `space_id=eq.${spaceId}`,
			},
			(payload) => {
				const store = useEntityStore.getState()
				if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
					const entity = payload.new as Entity
					useEntityStore.setState({ _fromCDC: true })
					store.upsert(entity)
					useEntityStore.setState({ _fromCDC: false })
				} else if (payload.eventType === 'DELETE') {
					const old = payload.old as { id: string }
					useEntityStore.setState({ _fromCDC: true })
					store.remove(old.id)
					useEntityStore.setState({ _fromCDC: false })
				}
			},
		)
		.subscribe()

	// --- Client → DB sync ---
	const unsubscribe = useEntityStore.subscribe((state) => {
		if (state._hydrating) return
		if (state._fromCDC) {
			// Still update baseline to prevent false diffs on next real change
			previousEntities = state.entities
			return
		}

		const currentEntities = state.entities

		for (const id of Object.keys(currentEntities)) {
			const prev = previousEntities[id]
			const curr = currentEntities[id]

			// Skip if the reference hasn't changed (no mutation)
			if (prev === curr) continue

			// Clear any pending timer for this entity so we restart the debounce
			const existing = timers.get(id)
			if (existing) clearTimeout(existing)

			const delay = prev ? debounceDelay(prev, curr) : FAST_DEBOUNCE_MS

			const timer = setTimeout(() => {
				timers.delete(id)
				const supabase = getSupabaseBrowserClient()
				supabase.from('entities').upsert(curr)
			}, delay)

			timers.set(id, timer)
		}

		previousEntities = currentEntities
	})

	return () => {
		unsubscribe()
		supabase.removeChannel(channel)
		for (const timer of timers.values()) {
			clearTimeout(timer)
		}
		timers.clear()
	}
}
