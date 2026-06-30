import { isSelfWrite } from '@/core/agent-chat/agentActionInterpreter'
import { useEntityStore } from '@/core/entityStore'
import { getSupabaseBrowserClient } from '@/core/supabase/client'
import { dbg } from '@/lib/debug'
import { coercePresentation } from '@/lib/presentationRules'
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

/** Persist a single entity to Supabase, logging on failure. */
function syncEntity(entity: Entity): void {
	dbg('db', 'upsert', { id: entity.id, type: entity.type })
	const supabase = getSupabaseBrowserClient()
	supabase
		.from('entities')
		.upsert(entity)
		.then(({ error }) => {
			if (error) console.error('[entitySync] upsert failed', entity.id, error.message)
		})
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
 * Returns an unsubscribe function that stops listening and flushes pending changes.
 */
export function startEntitySync(spaceId: string): () => void {
	const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; entity: Entity }>()
	let previousEntities: Record<string, Entity> = useEntityStore.getState().entities

	// --- CDC subscription: DB → client ---
	const supabase = getSupabaseBrowserClient()

	// Ensure realtime WebSocket has the user's JWT so RLS evaluates correctly.
	// createBrowserClient uses cookies for REST but may not pass the token to
	// the realtime connection automatically.
	let channel: ReturnType<typeof supabase.channel> | null = null

	async function initCDC() {
		const {
			data: { session },
		} = await supabase.auth.getSession()
		if (session?.access_token) {
			supabase.realtime.setAuth(session.access_token)
		}

		channel = supabase
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
						dbg('cdc', payload.eventType, { id: entity.id, type: entity.type })
						// TODO: remove diagnostic log after composed-app pipeline is stable
						const st = entity.state as Record<string, unknown> | undefined
						if (st?.building !== undefined || st?._def !== undefined) {
							console.log(
								'[CDC]',
								payload.eventType,
								entity.id,
								'_def:',
								!!st?._def,
								'building:',
								st?.building,
							)
						}

						// Coerce presentation — agent may write invalid values directly to DB.
						// Generated apps (_code in state) are always window or hidden.
						const isGenerated = typeof st?._code === 'string'
						const correctedPresentation = isGenerated
							? entity.presentation === 'hidden'
								? ('hidden' as const)
								: ('window' as const)
							: coercePresentation(entity.type, entity.presentation)
						const corrected: Entity =
							correctedPresentation !== entity.presentation
								? { ...entity, presentation: correctedPresentation }
								: entity

						// Skip CDC echo for entities the frontend just wrote via ui_action
						if (!isSelfWrite(entity.id)) {
							useEntityStore.setState({ _fromCDC: true })
							store.upsert(corrected)
							useEntityStore.setState({ _fromCDC: false })

							// Write the fix back to the DB so it persists
							if (corrected !== entity) {
								syncEntity(corrected)
							}
						}
					} else if (payload.eventType === 'DELETE') {
						const old = payload.old as { id: string }
						dbg('cdc', 'DELETE', { id: old.id })
						useEntityStore.setState({ _fromCDC: true })
						store.remove(old.id)
						useEntityStore.setState({ _fromCDC: false })
					}
				},
			)
			.subscribe((_status, err) => {
				if (err) console.error('[entitySync] channel error:', err)
			})
	}
	initCDC()

	// Keep realtime auth in sync when token refreshes
	const {
		data: { subscription: authSub },
	} = supabase.auth.onAuthStateChange((_event, session) => {
		if (session?.access_token) {
			supabase.realtime.setAuth(session.access_token)
		}
	})

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
			// Pending entities have non-UUID IDs — skip until finalized
			if (id.startsWith('pending-')) continue

			const prev = previousEntities[id]
			const curr = currentEntities[id]

			// Entities being built by the background builder — builder is the authority
			// for state. Don't overwrite server-side state with stale client state.
			if ((curr.state as Record<string, unknown>)?.building) continue

			// Skip if the reference hasn't changed (no mutation)
			if (prev === curr) continue

			// Clear any pending timer for this entity so we restart the debounce
			const existing = pending.get(id)
			if (existing) clearTimeout(existing.timer)

			// Archive is critical — sync immediately (no debounce)
			const isArchive = prev && !prev.archived && curr.archived
			if (isArchive) {
				pending.delete(id)
				syncEntity(curr)
				continue
			}

			const delay = prev ? debounceDelay(prev, curr) : FAST_DEBOUNCE_MS

			const timer = setTimeout(() => {
				pending.delete(id)
				syncEntity(curr)
			}, delay)

			pending.set(id, { timer, entity: curr })
		}

		previousEntities = currentEntities
	})

	// --- Flush all pending changes (used on unload and cleanup) ---
	function flushPending() {
		for (const [, { timer, entity }] of pending) {
			clearTimeout(timer)
			syncEntity(entity)
		}
		pending.clear()
	}

	const handleBeforeUnload = () => flushPending()
	window.addEventListener('beforeunload', handleBeforeUnload)

	return () => {
		window.removeEventListener('beforeunload', handleBeforeUnload)
		unsubscribe()
		authSub.unsubscribe()
		if (channel) supabase.removeChannel(channel)
		flushPending()
	}
}
