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
 * - Diffs previous vs current entities using referential equality.
 * - Debounces upserts per-entity with tier-based delays.
 * - Skips writes while `_hydrating` is true (initial load from DB).
 *
 * Returns an unsubscribe function that stops listening and clears pending timers.
 */
export function startEntitySync(): () => void {
	const timers = new Map<string, ReturnType<typeof setTimeout>>()
	let previousEntities: Record<string, Entity> = useEntityStore.getState().entities

	const unsubscribe = useEntityStore.subscribe((state) => {
		if (state._hydrating) return

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
		for (const timer of timers.values()) {
			clearTimeout(timer)
		}
		timers.clear()
	}
}
