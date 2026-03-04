import { markGathering, markScattering } from '@/core/canvas/SpaceRenderer'
import { useEntityStore } from '@/core/entityStore'
import { getSupabaseBrowserClient } from '@/core/supabase/client'
import type { Entity } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreamContext {
	spaceId: string
	userId: string
	viewport: { width: number; height: number }
}

interface QueuedAction {
	execute: () => Promise<void> | void
	durationMs: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_W = 232
const CARD_H = 300
const GAP = 16
const GRID_COLS = 5

const GATHER_DURATION_MS = 700
const SCATTER_DURATION_MS = 600
const EJECT_DURATION_MS = 400

const SELF_WRITE_EXPIRY_MS = 2000

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const actionQueue: QueuedAction[] = []
let queueDraining = false
let pendingIndex = 0

/** IDs of entities the frontend just wrote to Supabase — suppress CDC echo. */
const selfWriteIds = new Set<string>()

/** Action IDs already handled via ui_action — used to detect fallback writes. */
const handledActionIds = new Set<string>()

/** Entity IDs created/updated via ui_action in this turn. */
const handledEntityIds = new Set<string>()

// ---------------------------------------------------------------------------
// CDC suppression
// ---------------------------------------------------------------------------

export function isSelfWrite(entityId: string): boolean {
	return selfWriteIds.has(entityId)
}

function trackSelfWrite(entityId: string) {
	selfWriteIds.add(entityId)
	setTimeout(() => selfWriteIds.delete(entityId), SELF_WRITE_EXPIRY_MS)
}

// ---------------------------------------------------------------------------
// Fallback detection
// ---------------------------------------------------------------------------

/** Was this entity already applied via ui_action? (Prevents duplicate upsert from fallback.) */
export function isHandledByUIAction(entityId: string): boolean {
	return handledEntityIds.has(entityId)
}

// ---------------------------------------------------------------------------
// Supabase write helper
// ---------------------------------------------------------------------------

function writeEntity(entity: Entity): void {
	trackSelfWrite(entity.id)
	const supabase = getSupabaseBrowserClient()
	supabase
		.from('entities')
		.upsert(entity)
		.then(({ error }) => {
			if (error) console.error('[agentInterpreter] upsert failed', entity.id, error.message)
		})
}

// ---------------------------------------------------------------------------
// Action result callback
// ---------------------------------------------------------------------------

async function postActionResult(
	actionId: string,
	spaceId: string,
	userId: string,
	success: boolean,
	result?: Record<string, unknown>,
	error?: string,
): Promise<void> {
	try {
		await fetch('/api/agent/action-result', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action_id: actionId,
				space_id: spaceId,
				user_id: userId,
				success,
				result,
				error,
			}),
		})
	} catch (err) {
		console.error('[agentInterpreter] action-result POST failed', err)
	}
}

// ---------------------------------------------------------------------------
// Animation queue
// ---------------------------------------------------------------------------

async function drainQueue() {
	if (queueDraining) return
	queueDraining = true

	while (actionQueue.length > 0) {
		const action = actionQueue.shift()
		if (!action) break
		try {
			await action.execute()
		} catch (err) {
			console.error('[agentInterpreter] queued action failed', err)
		}
		if (action.durationMs > 0) {
			await new Promise((r) => setTimeout(r, action.durationMs))
		}
	}

	queueDraining = false
}

function enqueue(action: QueuedAction) {
	actionQueue.push(action)
	drainQueue()
}

// ---------------------------------------------------------------------------
// Pending entity builder (moved from consumeAgentStream)
// ---------------------------------------------------------------------------

export function buildPendingEntity(
	args: Record<string, unknown>,
	context: StreamContext,
	index = 0,
): Entity {
	const col = index % GRID_COLS
	const row = Math.floor(index / GRID_COLS)
	const cx = context.viewport.width / 2 - CARD_W / 2
	const cy = context.viewport.height / 2 - CARD_H / 2
	const position = {
		x: Math.round(cx + (col - 2) * (CARD_W + GAP)),
		y: Math.round(cy + row * (CARD_H + GAP)),
		locked: false,
	}

	return {
		id: '',
		space_id: context.spaceId,
		user_id: context.userId,
		type: (args.type as string) || 'note',
		presentation: 'card',
		position,
		size: { width: 232, height: 300 },
		z_index: 1,
		content: '',
		state: {
			_pending: true,
			generation_prompt: args.generation_prompt,
			summary: args.summary,
		},
		summary: (args.summary as string) || 'Generating...',
		created_by: 'agent',
		archived: false,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}
}

/** Heuristic: does this result look like an Entity we should upsert? */
export function isEntityPayload(result: Record<string, unknown>): result is Entity {
	return (
		typeof result.id === 'string' &&
		typeof result.type === 'string' &&
		typeof result.presentation === 'string' &&
		typeof result.space_id === 'string' &&
		typeof result.position === 'object' &&
		result.position !== null &&
		typeof result.size === 'object' &&
		result.size !== null
	)
}

/** Get and increment the pending entity counter. */
export function nextPendingIndex(): number {
	return pendingIndex++
}

/** Reset pending counter (call at stream start). */
export function resetPendingIndex() {
	pendingIndex = 0
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

function handleCreateEntity(
	actionId: string,
	params: Record<string, unknown>,
	context: StreamContext,
) {
	const store = useEntityStore.getState()
	const isFolder = params.type === 'folder'

	// Build entity from params
	const entity: Entity = {
		id: (params.id as string) || crypto.randomUUID(),
		space_id: context.spaceId,
		user_id: context.userId,
		type: (params.type as string) || 'note',
		presentation: (params.presentation as Entity['presentation']) || (isFolder ? 'folder' : 'card'),
		position: (params.position as Entity['position']) || {
			x: context.viewport.width / 2 - CARD_W / 2,
			y: context.viewport.height / 2 - CARD_H / 2,
			locked: false,
		},
		size: (params.size as Entity['size']) || {
			width: isFolder ? 200 : 600,
			height: isFolder ? 200 : 400,
		},
		z_index: Math.max(...Object.values(store.entities).map((e) => e.z_index), 0) + 1,
		content: (params.content as string) || '',
		state: {
			...((params.state as Record<string, unknown>) || {}),
			...(isFolder ? { _agentFolder: true } : {}),
		},
		summary: (params.summary as string) || '',
		created_by: 'agent',
		archived: false,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}

	handledEntityIds.add(entity.id)

	// Upsert into store — Framer Motion handles entrance animation
	store.upsert(entity)

	if (!isFolder) {
		store.setFocused(entity.id)
	}

	// Write to Supabase
	writeEntity(entity)

	// Notify agent
	postActionResult(
		actionId,
		context.spaceId,
		context.userId,
		true,
		entity as unknown as Record<string, unknown>,
	)
}

function handleUpdateEntity(
	actionId: string,
	params: Record<string, unknown>,
	context: StreamContext,
) {
	const store = useEntityStore.getState()
	const entityId = params.id as string
	if (!entityId) {
		postActionResult(
			actionId,
			context.spaceId,
			context.userId,
			false,
			undefined,
			'Missing entity id',
		)
		return
	}

	const existing = store.entities[entityId]
	if (!existing) {
		postActionResult(
			actionId,
			context.spaceId,
			context.userId,
			false,
			undefined,
			`Entity ${entityId} not found`,
		)
		return
	}

	handledEntityIds.add(entityId)
	store.setAgentActive(entityId)

	// Merge updates
	const updated: Entity = {
		...existing,
		...(params.content !== undefined ? { content: params.content as string } : {}),
		...(params.summary !== undefined ? { summary: params.summary as string } : {}),
		...(params.presentation !== undefined
			? { presentation: params.presentation as Entity['presentation'] }
			: {}),
		...(params.position !== undefined ? { position: params.position as Entity['position'] } : {}),
		...(params.size !== undefined ? { size: params.size as Entity['size'] } : {}),
		state: params.state !== undefined ? (params.state as Record<string, unknown>) : existing.state,
		updated_at: new Date().toISOString(),
	}

	store.upsert(updated)
	store.setFocused(entityId)
	store.clearAgentActive(entityId)

	writeEntity(updated)

	postActionResult(
		actionId,
		context.spaceId,
		context.userId,
		true,
		updated as unknown as Record<string, unknown>,
	)
}

function handleCallEntityTool(
	actionId: string,
	params: Record<string, unknown>,
	context: StreamContext,
) {
	const store = useEntityStore.getState()
	const entityId = params.entity_id as string
	const toolName = params.tool_name as string

	if (!entityId || !toolName) {
		postActionResult(
			actionId,
			context.spaceId,
			context.userId,
			false,
			undefined,
			'Missing entity_id or tool_name',
		)
		return
	}

	store.setAgentActive(entityId)

	switch (toolName) {
		case 'add_children': {
			const childIds = params.child_ids as string[]
			if (!childIds?.length) {
				store.clearAgentActive(entityId)
				postActionResult(
					actionId,
					context.spaceId,
					context.userId,
					false,
					undefined,
					'Missing child_ids',
				)
				return
			}

			// Mark children for attention ring
			for (const id of childIds) store.setAgentActive(id)

			// Mark for animation, then queue the gather
			markGathering(childIds)

			enqueue({
				execute: async () => {
					store.gatherEntities(childIds, undefined, entityId)

					// Wait for gather phases to complete before writing
					await new Promise((r) => setTimeout(r, 650))

					// Write all affected entities to Supabase
					const current = useEntityStore.getState()
					const folder = current.entities[entityId]
					if (folder) writeEntity(folder)
					for (const id of childIds) {
						const child = current.entities[id]
						if (child) writeEntity(child)
					}
					handledEntityIds.add(entityId)
					for (const id of childIds) handledEntityIds.add(id)

					store.clearAgentActive(entityId)
					for (const id of childIds) store.clearAgentActive(id)

					postActionResult(actionId, context.spaceId, context.userId, true, {
						entity_id: entityId,
						tool_name: toolName,
						child_ids: childIds,
					})
				},
				durationMs: GATHER_DURATION_MS,
			})
			return
		}

		case 'scatter': {
			const folder = store.entities[entityId]
			if (!folder) {
				store.clearAgentActive(entityId)
				postActionResult(
					actionId,
					context.spaceId,
					context.userId,
					false,
					undefined,
					'Folder not found',
				)
				return
			}
			const childIds = (folder.state?.child_ids ?? []) as string[]

			markScattering(childIds, 60)

			enqueue({
				execute: async () => {
					store.scatterFolder(entityId, context.viewport)

					// Wait for scatter phases to complete before writing
					await new Promise((r) => setTimeout(r, 550))

					const current = useEntityStore.getState()
					for (const id of childIds) {
						const child = current.entities[id]
						if (child) writeEntity(child)
						handledEntityIds.add(id)
					}
					const updatedFolder = current.entities[entityId]
					if (updatedFolder) writeEntity(updatedFolder)
					handledEntityIds.add(entityId)

					store.clearAgentActive(entityId)

					postActionResult(actionId, context.spaceId, context.userId, true, {
						entity_id: entityId,
						tool_name: toolName,
					})
				},
				durationMs: SCATTER_DURATION_MS,
			})
			return
		}

		case 'remove_child': {
			const childId = params.child_id as string
			if (!childId) {
				store.clearAgentActive(entityId)
				postActionResult(
					actionId,
					context.spaceId,
					context.userId,
					false,
					undefined,
					'Missing child_id',
				)
				return
			}

			store.setAgentActive(childId)
			markScattering([childId])

			enqueue({
				execute: async () => {
					store.ejectFromFolder(entityId, childId, context.viewport)

					await new Promise((r) => setTimeout(r, 350))

					const current = useEntityStore.getState()
					const child = current.entities[childId]
					if (child) writeEntity(child)
					const folder = current.entities[entityId]
					if (folder) writeEntity(folder)
					handledEntityIds.add(childId)
					handledEntityIds.add(entityId)

					store.clearAgentActive(entityId)
					store.clearAgentActive(childId)

					postActionResult(actionId, context.spaceId, context.userId, true, {
						entity_id: entityId,
						tool_name: toolName,
						child_id: childId,
					})
				},
				durationMs: EJECT_DURATION_MS,
			})
			return
		}

		default: {
			// For other entity tools, POST to the call route and upsert the result
			store.clearAgentActive(entityId)
			callEntityToolViaAPI(entityId, toolName, params, actionId, context)
			return
		}
	}
}

async function callEntityToolViaAPI(
	entityId: string,
	toolName: string,
	params: Record<string, unknown>,
	actionId: string,
	context: StreamContext,
) {
	try {
		const response = await fetch(`/api/entities/${entityId}/call`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tool: toolName, args: params.args }),
		})
		const result = await response.json()
		if (response.ok && isEntityPayload(result)) {
			useEntityStore.getState().upsert(result as Entity)
			writeEntity(result as Entity)
			handledEntityIds.add(entityId)
		}
		postActionResult(actionId, context.spaceId, context.userId, response.ok, result)
	} catch (err) {
		postActionResult(
			actionId,
			context.spaceId,
			context.userId,
			false,
			undefined,
			err instanceof Error ? err.message : 'Unknown error',
		)
	}
}

// ---------------------------------------------------------------------------
// Public API — called from consumeAgentStream
// ---------------------------------------------------------------------------

export function handleAction(
	actionId: string,
	action: string,
	params: Record<string, unknown>,
	context: StreamContext,
) {
	handledActionIds.add(actionId)

	switch (action) {
		case 'create_entity':
			handleCreateEntity(actionId, params, context)
			break
		case 'update_entity':
			handleUpdateEntity(actionId, params, context)
			break
		case 'call_entity_tool':
			handleCallEntityTool(actionId, params, context)
			break
		default:
			console.warn('[agentInterpreter] unknown action:', action)
			postActionResult(
				actionId,
				context.spaceId,
				context.userId,
				false,
				undefined,
				`Unknown action: ${action}`,
			)
	}
}

/** Reset per-turn state. Call at the start of each agent stream. */
export function resetTurnState() {
	handledActionIds.clear()
	handledEntityIds.clear()
	resetPendingIndex()
}
