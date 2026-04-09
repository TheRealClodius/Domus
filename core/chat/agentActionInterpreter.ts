import { folderApp } from '@/apps/folder'
import { markGathering, markScattering } from '@/core/canvas/SpaceRenderer'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import { FOLDER_SIZE } from '@/core/spatial/folderConstants'
import { getSupabaseBrowserClient } from '@/core/supabase/client'
import { dbg } from '@/lib/debug'
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

type EntitySnapshot = Map<string, Entity | null>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_W = 232
const CARD_H = 300
const GAP = 16
const GRID_COLS = 5

const SELF_WRITE_EXPIRY_MS = 2000

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const actionQueue: QueuedAction[] = []
let queueDraining = false
let pendingIndex = 0

/** Monotonically increasing counter — bumped on each turn reset so in-flight handlers can bail out. */
let turnGeneration = 0

/** IDs of entities the frontend just wrote to Supabase — suppress CDC echo. */
const selfWriteIds = new Set<string>()

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
	dbg('db', 'agent upsert', { id: entity.id, type: entity.type })
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

const ACTION_RESULT_MAX_RETRIES = 3
const ACTION_RESULT_BASE_DELAY_MS = 1000

async function postActionResult(
	actionId: string,
	context: StreamContext,
	success: boolean,
	result?: Record<string, unknown>,
	error?: string,
): Promise<void> {
	const payload = JSON.stringify({
		action_id: actionId,
		space_id: context.spaceId,
		user_id: context.userId,
		success,
		result,
		error,
	})

	for (let attempt = 0; attempt <= ACTION_RESULT_MAX_RETRIES; attempt++) {
		try {
			const response = await fetch('/api/agent/action-result', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: payload,
			})

			if (response.ok) {
				dbg('action', 'action-result', { actionId, status: response.status, success })
				return
			}

			// 4xx errors are not transient — don't retry
			if (response.status < 500) {
				console.warn('[agentInterpreter] action-result rejected', actionId, response.status)
				return
			}

			// 5xx — retry if attempts remain
			if (attempt < ACTION_RESULT_MAX_RETRIES) {
				await new Promise((r) => setTimeout(r, ACTION_RESULT_BASE_DELAY_MS * 2 ** attempt))
				continue
			}
			console.error(
				'[agentInterpreter] action-result failed after retries',
				actionId,
				response.status,
			)
		} catch (err) {
			if (attempt < ACTION_RESULT_MAX_RETRIES) {
				await new Promise((r) => setTimeout(r, ACTION_RESULT_BASE_DELAY_MS * 2 ** attempt))
				continue
			}
			console.error('[agentInterpreter] action-result POST failed after retries', actionId, err)
		}
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

function captureEntitySnapshot(entityIds: string[]): EntitySnapshot {
	const entities = useEntityStore.getState().entities
	const snapshot: EntitySnapshot = new Map()
	for (const id of entityIds) {
		snapshot.set(id, entities[id] ?? null)
	}
	return snapshot
}

function restoreEntitySnapshot(snapshot: EntitySnapshot): void {
	useEntityStore.setState((state) => {
		const entities = { ...state.entities }
		for (const [id, entity] of snapshot) {
			if (entity) {
				entities[id] = entity
			} else {
				delete entities[id]
			}
		}
		return { entities }
	})
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
		size: { width: CARD_W, height: CARD_H },
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
			width: isFolder ? FOLDER_SIZE : CARD_W,
			height: isFolder ? FOLDER_SIZE : CARD_H,
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
	dbg('action', 'create_entity', { id: entity.id, type: entity.type, pos: entity.position })
	store.upsert(entity)

	if (!isFolder) {
		store.setFocused(entity.id)
	}

	writeEntity(entity)

	const schema = isFolder ? folderApp.getSchema(entity.state ?? {}) : undefined
	postActionResult(actionId, context, true, {
		...(entity as unknown as Record<string, unknown>),
		...(schema ? { schema: { tools: schema } } : {}),
	})
}

function handleUpdateEntity(
	actionId: string,
	params: Record<string, unknown>,
	context: StreamContext,
) {
	const store = useEntityStore.getState()
	const entityId = params.id as string
	if (!entityId) {
		postActionResult(actionId, context, false, undefined, 'Missing entity id')
		return
	}

	const existing = store.entities[entityId]
	if (!existing) {
		postActionResult(actionId, context, false, undefined, `Entity ${entityId} not found`)
		return
	}

	handledEntityIds.add(entityId)
	store.setAgentActive(entityId)

	const updated: Entity = {
		...existing,
		...(params.content !== undefined ? { content: params.content as string } : {}),
		...(params.summary !== undefined ? { summary: params.summary as string } : {}),
		...(params.presentation !== undefined
			? { presentation: params.presentation as Entity['presentation'] }
			: {}),
		...(params.position !== undefined ? { position: params.position as Entity['position'] } : {}),
		...(params.size !== undefined ? { size: params.size as Entity['size'] } : {}),
		state:
			params.state !== undefined
				? { ...existing.state, ...(params.state as Record<string, unknown>) }
				: existing.state,
		updated_at: new Date().toISOString(),
	}

	dbg('action', 'update_entity', {
		id: entityId,
		fields: Object.keys(params).filter((k) => k !== 'id'),
	})
	store.upsert(updated)
	store.setFocused(entityId)
	store.clearAgentActive(entityId)

	writeEntity(updated)
	postActionResult(actionId, context, true, updated as unknown as Record<string, unknown>)
}

function handleCallEntityTool(
	actionId: string,
	params: Record<string, unknown>,
	context: StreamContext,
) {
	const entityId = params.entity_id as string
	const toolName = params.tool_name as string

	if (!entityId || !toolName) {
		postActionResult(actionId, context, false, undefined, 'Missing entity_id or tool_name')
		return
	}

	useEntityStore.getState().setAgentActive(entityId)
	dbg('action', toolName, { entity_id: entityId, args: params })
	const gen = turnGeneration

	switch (toolName) {
		case 'add_children': {
			const childIds = params.child_ids as string[]
			if (!childIds?.length) {
				useEntityStore.getState().clearAgentActive(entityId)
				postActionResult(actionId, context, false, undefined, 'Missing child_ids')
				return
			}
			const snapshot = captureEntitySnapshot([entityId, ...childIds])

			for (const id of childIds) useEntityStore.getState().setAgentActive(id)
			// markGathering moved inside execute — below RAF — so flags are set in the
			// same synchronous block as gatherEntities regardless of queue wait time

			enqueue({
				execute: async () => {
					// Yield to the event loop so React can commit the card-creation renders
					// before gatherEntities moves them. execute() runs synchronously until
					// its first await (this one), so card-creation MessageChannel renders are
					// still pending. setTimeout(0) fires after those renders complete, ensuring
					// Framer Motion has the cards at their creation positions before we animate.
					await new Promise((r) => setTimeout(r, 0))

					markGathering(childIds)
					useEntityStore.getState().gatherEntities(childIds, undefined, entityId)

					// Wait for gather phases (approaching 300ms + closing 300ms + buffer)
					await new Promise((r) => setTimeout(r, 650))
					if (gen !== turnGeneration) {
						restoreEntitySnapshot(snapshot)
						const current = useEntityStore.getState()
						current.clearAgentActive(entityId)
						for (const id of childIds) current.clearAgentActive(id)
						return
					}

					const current = useEntityStore.getState()
					const folder = current.entities[entityId]
					if (folder) writeEntity(folder)
					for (const id of childIds) {
						const child = current.entities[id]
						if (child) writeEntity(child)
					}
					handledEntityIds.add(entityId)
					for (const id of childIds) handledEntityIds.add(id)

					current.clearAgentActive(entityId)
					for (const id of childIds) current.clearAgentActive(id)

					const actualChildIds =
						(current.entities[entityId]?.state?.child_ids as string[] | undefined) ?? []
					postActionResult(actionId, context, true, {
						entity_id: entityId,
						tool_name: toolName,
						child_ids: actualChildIds,
					})
				},
				durationMs: 0,
			})
			return
		}

		case 'scatter': {
			const folder = useEntityStore.getState().entities[entityId]
			if (!folder) {
				useEntityStore.getState().clearAgentActive(entityId)
				postActionResult(actionId, context, false, undefined, 'Folder not found')
				return
			}
			const childIds = (folder.state?.child_ids ?? []) as string[]
			const snapshot = captureEntitySnapshot([entityId, ...childIds])

			markScattering(childIds, 60)

			enqueue({
				execute: async () => {
					useEntityStore.getState().scatterFolder(entityId, context.viewport)

					// Wait for scatter phase (500ms + buffer)
					await new Promise((r) => setTimeout(r, 550))
					if (gen !== turnGeneration) {
						restoreEntitySnapshot(snapshot)
						useEntityStore.getState().clearAgentActive(entityId)
						return
					}

					const current = useEntityStore.getState()
					for (const id of childIds) {
						const child = current.entities[id]
						if (child) writeEntity(child)
						handledEntityIds.add(id)
					}
					const updatedFolder = current.entities[entityId]
					if (updatedFolder) writeEntity(updatedFolder)
					handledEntityIds.add(entityId)

					current.clearAgentActive(entityId)

					postActionResult(actionId, context, true, {
						entity_id: entityId,
						tool_name: toolName,
					})
				},
				durationMs: 0,
			})
			return
		}

		case 'remove_child': {
			const childId = params.child_id as string
			if (!childId) {
				useEntityStore.getState().clearAgentActive(entityId)
				postActionResult(actionId, context, false, undefined, 'Missing child_id')
				return
			}
			const snapshot = captureEntitySnapshot([entityId, childId])

			useEntityStore.getState().setAgentActive(childId)
			markScattering([childId])

			enqueue({
				execute: async () => {
					useEntityStore.getState().ejectFromFolder(entityId, childId, context.viewport)

					await new Promise((r) => setTimeout(r, 350))
					if (gen !== turnGeneration) {
						restoreEntitySnapshot(snapshot)
						const current = useEntityStore.getState()
						current.clearAgentActive(entityId)
						current.clearAgentActive(childId)
						return
					}

					const current = useEntityStore.getState()
					const child = current.entities[childId]
					if (child) writeEntity(child)
					const updatedFolder = current.entities[entityId]
					if (updatedFolder) writeEntity(updatedFolder)
					handledEntityIds.add(childId)
					handledEntityIds.add(entityId)

					current.clearAgentActive(entityId)
					current.clearAgentActive(childId)

					postActionResult(actionId, context, true, {
						entity_id: entityId,
						tool_name: toolName,
						child_id: childId,
					})
				},
				durationMs: 0,
			})
			return
		}

		default: {
			useEntityStore.getState().clearAgentActive(entityId)
			postActionResult(actionId, context, false, undefined, `Unknown entity tool: ${toolName}`)
			return
		}
	}
}

function handleOpenSheet(
	actionId: string,
	params: Record<string, unknown>,
	context: StreamContext,
) {
	const entityId = params.entity_id as string
	if (!entityId) {
		postActionResult(actionId, context, false, undefined, 'Missing entity_id')
		return
	}
	useSheetStore.getState().open(entityId, 'entity')
	postActionResult(actionId, context, true, { entity_id: entityId })
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
		case 'open_sheet':
			handleOpenSheet(actionId, params, context)
			break
		default:
			console.warn('[agentInterpreter] unknown action:', action)
			postActionResult(actionId, context, false, undefined, `Unknown action: ${action}`)
	}
}

/** Reset per-turn state. Call at the start of each agent stream. */
export function resetTurnState() {
	handledEntityIds.clear()
	resetPendingIndex()
	turnGeneration++
	actionQueue.length = 0
}
