// SPIKE: entity-as-mcp — POST /api/entities/[id]/call
// Executes a tool on an entity via its app's reduce function, writes new state.
import { NextResponse } from 'next/server'
import { resolveAuth } from '@/app/api/_auth'
import { getAppType } from '@/apps/_registry'
import { getSupabaseServiceClient } from '@/core/supabase/service'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const auth = await resolveAuth(request)
	if (auth.type === 'error') {
		return NextResponse.json({ error: auth.message }, { status: auth.status })
	}

	// Parse body
	let body: { tool_name?: string; params?: Record<string, unknown> }
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
	}
	const { tool_name: toolName, params: toolParams } = body
	if (!toolName) {
		return NextResponse.json({ error: 'Missing tool_name' }, { status: 400 })
	}

	// Read entity
	const readClient = auth.type === 'service' ? getSupabaseServiceClient() : auth.supabase
	const spaceId = auth.type === 'service' ? auth.space_id : undefined

	let query = readClient.from('entities').select('*').eq('id', id)
	if (spaceId) {
		query = query.eq('space_id', spaceId)
	}
	const { data: entity, error } = await query.maybeSingle()

	if (error || !entity) {
		return NextResponse.json({ error: 'not_found' }, { status: 404 })
	}

	// For cookie auth, verify space ownership
	if (auth.type === 'user') {
		const { data: space } = await auth.supabase
			.from('spaces')
			.select('id')
			.eq('id', entity.space_id)
			.maybeSingle()
		if (!space) {
			return NextResponse.json({ error: 'forbidden' }, { status: 403 })
		}
	}

	const app = getAppType(entity.type)

	if (app?.getSchema) {
		// System app: validate tool and execute via reduce
		const schema = app.getSchema(entity.state ?? {})
		const toolDef = schema.find((t) => t.name === toolName)
		if (!toolDef) {
			return NextResponse.json(
				{ ok: false, error: 'tool_not_available', tool_name: toolName, schema },
				{ status: 400 },
			)
		}

		// Capture pre-reduce state before mutating (needed for scatter side effects)
		const preReduceState = entity.state ?? {}
		const newState = app.reduce(preReduceState, toolName, toolParams ?? {})
		const newSummary = app.summarize(newState)

		const serviceClient = getSupabaseServiceClient()
		const { error: writeError } = await serviceClient
			.from('entities')
			.update({ state: newState, summary: newSummary })
			.eq('id', id)

		if (writeError) {
			return NextResponse.json({ ok: false, error: 'write_failed' }, { status: 500 })
		}

		// Folder side effects: patch child entities after the folder state is written
		if (entity.type === 'folder') {
			const p = (toolParams ?? {}) as Record<string, unknown>
			const preChildIds = (preReduceState.child_ids as string[] | undefined) ?? []

			type ChildOp = {
				childId: string
				presentation: 'hidden' | 'card'
				folderId: string | undefined
			}
			let childOps: ChildOp[] = []

			if (toolName === 'add_children') {
				const addIds = (p.child_ids as string[]) ?? []
				childOps = addIds.map((childId) => ({ childId, presentation: 'hidden', folderId: id }))
			} else if (toolName === 'remove_child') {
				childOps = [{ childId: p.child_id as string, presentation: 'card', folderId: undefined }]
			} else if (toolName === 'scatter') {
				childOps = preChildIds.map((childId) => ({
					childId,
					presentation: 'card',
					folderId: undefined,
				}))
			}

			await Promise.all(
				childOps.map(async ({ childId, presentation, folderId }) => {
					try {
						const { data: child } = await serviceClient
							.from('entities')
							.select('state')
							.eq('id', childId)
							.maybeSingle()

						const childState = { ...(child?.state ?? {}), _folderId: folderId }
						await serviceClient
							.from('entities')
							.update({ state: childState, presentation })
							.eq('id', childId)
					} catch (err) {
						console.error(`Folder side effect failed for child ${childId}:`, err)
					}
				}),
			)
		}

		return NextResponse.json({
			ok: true,
			result: newState,
			summary: newSummary,
			schema: app.getSchema(newState),
		})
	}

	// Generated app: merge tool params into runtime state
	const stateSchema = entity.state?._schema as Array<Record<string, unknown>> | undefined
	if (stateSchema && Array.isArray(stateSchema)) {
		const currentState = entity.state ?? {}
		const systemKeys: Record<string, unknown> = {}
		const runtimeState: Record<string, unknown> = {}
		for (const [k, v] of Object.entries(currentState)) {
			if (k.startsWith('_')) systemKeys[k] = v
			else runtimeState[k] = v
		}

		const newRuntime = { ...runtimeState, ...(toolParams ?? {}) }
		const newState = { ...systemKeys, ...newRuntime }

		const serviceClient = getSupabaseServiceClient()
		const { error: writeError } = await serviceClient
			.from('entities')
			.update({ state: newState })
			.eq('id', id)

		if (writeError) {
			return NextResponse.json({ ok: false, error: 'write_failed' }, { status: 500 })
		}

		return NextResponse.json({ ok: true, result: newRuntime })
	}

	return NextResponse.json({ error: 'no_schema', type: entity.type }, { status: 422 })
}
