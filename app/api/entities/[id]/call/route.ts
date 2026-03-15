// SPIKE: entity-as-mcp — POST /api/entities/[id]/call
// Executes a tool on an entity via its app's reduce function, writes new state.
import { NextResponse } from 'next/server'
import { resolveAuth } from '@/app/api/_auth'
import { getAppType } from '@/apps/_registry'
import { getSupabaseServiceClient } from '@/core/supabase/service'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const IMAGE_FETCH_TIMEOUT_MS = 10_000

function isSafeImageUrl(raw: string): boolean {
	let url: URL
	try {
		url = new URL(raw)
	} catch {
		return false
	}
	if (url.protocol !== 'https:') return false
	const host = url.hostname
	if (
		/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|fc|fd)/i.test(host)
	)
		return false
	return true
}

async function isMember(
	serviceClient: ReturnType<typeof getSupabaseServiceClient>,
	groupId: string,
	userId: string,
): Promise<boolean> {
	const { data } = await serviceClient
		.from('chat_members')
		.select('role')
		.eq('group_id', groupId)
		.eq('user_id', userId)
		.maybeSingle()
	return data !== null
}

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

		// Chat side effects: data queries and writes that augment the reduced state
		if (entity.type === 'chat') {
			// Resolve user_id for service auth (service key has no auth.uid())
			let userId: string | undefined
			if (auth.type === 'service') {
				const { data: space } = await serviceClient
					.from('spaces')
					.select('user_id')
					.eq('id', auth.space_id)
					.maybeSingle()
				userId = space?.user_id
			} else {
				const {
					data: { user },
				} = await auth.supabase.auth.getUser()
				userId = user?.id
			}

			if (!userId) {
				return NextResponse.json({ ok: false, error: 'could_not_resolve_user' }, { status: 500 })
			}

			const p = (toolParams ?? {}) as Record<string, unknown>

			if (toolName === 'list_groups') {
				const { data: groups } = await serviceClient
					.from('chat_members')
					.select('group_id, role, joined_at, last_read_at, chat_groups(*)')
					.eq('user_id', userId)

				return NextResponse.json({
					ok: true,
					result: { ...newState, groups: groups ?? [] },
					summary: newSummary,
					schema: app.getSchema(newState),
				})
			}

			if (toolName === 'list_messages') {
				const groupId = p.group_id as string
				if (!(await isMember(serviceClient, groupId, userId))) {
					return NextResponse.json({ ok: false, error: 'not_a_member' }, { status: 403 })
				}
				const limit = (p.limit as number | undefined) ?? 50
				let q = serviceClient
					.from('chat_messages')
					.select('*')
					.eq('group_id', groupId)
					.order('created_at', { ascending: false })
					.limit(limit)
				if (p.before_id) {
					const { data: ref } = await serviceClient
						.from('chat_messages')
						.select('created_at')
						.eq('id', p.before_id as string)
						.maybeSingle()
					if (ref?.created_at) {
						q = q.lt('created_at', ref.created_at)
					}
				}
				const { data: messages } = await q

				return NextResponse.json({
					ok: true,
					result: { ...newState, messages: messages ?? [], group_id: groupId },
					summary: newSummary,
					schema: app.getSchema(newState),
				})
			}

			if (toolName === 'get_group_summary') {
				const groupId = p.group_id as string
				if (!(await isMember(serviceClient, groupId, userId))) {
					return NextResponse.json({ ok: false, error: 'not_a_member' }, { status: 403 })
				}
				const limit = (p.limit as number | undefined) ?? 50
				const { data: messages } = await serviceClient
					.from('chat_messages')
					.select('*')
					.eq('group_id', groupId)
					.order('created_at', { ascending: false })
					.limit(limit)

				return NextResponse.json({
					ok: true,
					result: {
						...newState,
						messages: messages ?? [],
						group_id: groupId,
						hint: 'summarize these',
					},
					summary: newSummary,
					schema: app.getSchema(newState),
				})
			}

			if (toolName === 'search_messages') {
				const query = p.query as string
				let q = serviceClient
					.from('chat_messages')
					.select('*')
					.ilike('content', `%${query}%`)
					.order('created_at', { ascending: false })
					.limit(50)
				if (p.group_id) {
					if (!(await isMember(serviceClient, p.group_id as string, userId))) {
						return NextResponse.json({ ok: false, error: 'not_a_member' }, { status: 403 })
					}
					q = q.eq('group_id', p.group_id as string)
				} else {
					// Restrict to groups the user is a member of
					const { data: memberships } = await serviceClient
						.from('chat_members')
						.select('group_id')
						.eq('user_id', userId)
					const groupIds = (memberships ?? []).map((m) => m.group_id)
					if (groupIds.length === 0) {
						return NextResponse.json({
							ok: true,
							result: { ...newState, results: [] },
							summary: newSummary,
							schema: app.getSchema(newState),
						})
					}
					q = q.in('group_id', groupIds)
				}
				const { data: results } = await q

				return NextResponse.json({
					ok: true,
					result: { ...newState, results: results ?? [] },
					summary: newSummary,
					schema: app.getSchema(newState),
				})
			}

			if (toolName === 'create_group') {
				const groupId = crypto.randomUUID()
				const inviteCode = crypto.randomUUID().slice(0, 8)
				const { error: groupError } = await serviceClient.from('chat_groups').insert({
					id: groupId,
					name: p.name as string,
					kind: 'group',
					invite_code: inviteCode,
					created_by: userId,
				})
				if (groupError) {
					return NextResponse.json(
						{ ok: false, error: 'create_failed', detail: groupError.message },
						{ status: 500 },
					)
				}
				const { error: memberError } = await serviceClient.from('chat_members').insert({
					group_id: groupId,
					user_id: userId,
					role: 'owner',
				})
				if (memberError) {
					return NextResponse.json(
						{ ok: false, error: 'member_insert_failed', detail: memberError.message },
						{ status: 500 },
					)
				}
				return NextResponse.json({
					ok: true,
					result: { ...newState, created: true, group_id: groupId, invite_code: inviteCode },
					summary: newSummary,
					schema: app.getSchema(newState),
				})
			}

			if (toolName === 'send_message') {
				if (!(await isMember(serviceClient, p.group_id as string, userId))) {
					return NextResponse.json({ ok: false, error: 'not_a_member' }, { status: 403 })
				}
				const messageId = crypto.randomUUID()
				const { error: insertError } = await serviceClient.from('chat_messages').insert({
					id: messageId,
					group_id: p.group_id as string,
					user_id: userId,
					content: p.content as string,
				})
				if (insertError) {
					return NextResponse.json(
						{ ok: false, error: 'send_failed', detail: insertError.message },
						{ status: 500 },
					)
				}
				return NextResponse.json({
					ok: true,
					result: { ...newState, sent: true, message_id: messageId },
					summary: newSummary,
					schema: app.getSchema(newState),
				})
			}

			if (toolName === 'delete_group') {
				const { error: deleteError } = await serviceClient
					.from('chat_groups')
					.delete()
					.eq('id', p.group_id as string)
					.eq('created_by', userId)
				if (deleteError) {
					return NextResponse.json(
						{ ok: false, error: 'delete_failed', detail: deleteError.message },
						{ status: 500 },
					)
				}
				return NextResponse.json({
					ok: true,
					result: { ...newState, deleted: true },
					summary: newSummary,
					schema: app.getSchema(newState),
				})
			}

			if (toolName === 'send_image') {
				const imageUrl = p.image_url as string
				const groupId = p.group_id as string

				if (!(await isMember(serviceClient, groupId, userId))) {
					return NextResponse.json({ ok: false, error: 'not_a_member' }, { status: 403 })
				}

				if (!isSafeImageUrl(imageUrl)) {
					return NextResponse.json({ ok: false, error: 'invalid_image_url' }, { status: 400 })
				}

				// Fetch the image
				let imageBuffer: Buffer
				let mimeType: string
				try {
					const controller = new AbortController()
					const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS)
					let resp: Response
					try {
						resp = await fetch(imageUrl, { redirect: 'error', signal: controller.signal })
					} finally {
						clearTimeout(timeoutId)
					}

					if (!resp.ok) {
						return NextResponse.json({ ok: false, error: 'image_fetch_failed' }, { status: 400 })
					}
					mimeType = (resp.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase()
					if (!mimeType || !mimeType.startsWith('image/')) {
						return NextResponse.json(
							{ ok: false, error: 'invalid_image_content_type' },
							{ status: 400 },
						)
					}

					const contentLength = Number.parseInt(resp.headers.get('content-length') ?? '', 10)
					if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
						return NextResponse.json({ ok: false, error: 'image_too_large' }, { status: 400 })
					}

					const reader = resp.body?.getReader()
					if (!reader) {
						return NextResponse.json({ ok: false, error: 'image_fetch_failed' }, { status: 400 })
					}

					const chunks: Uint8Array[] = []
					let total = 0
					while (true) {
						const { done, value } = await reader.read()
						if (done) break
						if (!value) continue
						total += value.byteLength
						if (total > MAX_IMAGE_BYTES) {
							await reader.cancel().catch(() => undefined)
							return NextResponse.json({ ok: false, error: 'image_too_large' }, { status: 400 })
						}
						chunks.push(value)
					}
					imageBuffer = Buffer.concat(
						chunks.map((chunk) => Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)),
					)
				} catch {
					return NextResponse.json({ ok: false, error: 'image_fetch_failed' }, { status: 400 })
				}

				// Determine file extension from mime type
				const extMap: Record<string, string> = {
					'image/jpeg': 'jpg',
					'image/png': 'png',
					'image/gif': 'gif',
					'image/webp': 'webp',
					'image/svg+xml': 'svg',
				}
				const ext = extMap[mimeType] ?? 'jpg'

				const messageId = crypto.randomUUID()
				const storagePath = `${userId}/chat/${groupId}/${messageId}/image.${ext}`

				const { error: uploadError } = await serviceClient.storage
					.from('chat-media')
					.upload(storagePath, imageBuffer, { contentType: mimeType })

				if (uploadError) {
					return NextResponse.json(
						{ ok: false, error: 'upload_failed', detail: uploadError.message },
						{ status: 500 },
					)
				}

				const { error: insertError } = await serviceClient.from('chat_messages').insert({
					id: messageId,
					group_id: groupId,
					user_id: userId,
					content: '',
					media_path: storagePath,
					media_type: mimeType,
				})
				if (insertError) {
					return NextResponse.json(
						{ ok: false, error: 'send_failed', detail: insertError.message },
						{ status: 500 },
					)
				}

				return NextResponse.json({
					ok: true,
					result: { ...newState, sent: true, message_id: messageId, media_path: storagePath },
					summary: newSummary,
					schema: app.getSchema(newState),
				})
			}

			// set_active_group: no side effect, falls through to normal return below
		}

		// Folder side effects: patch child entities after the folder state is written
		if (entity.type === 'folder') {
			const p = (toolParams ?? {}) as Record<string, unknown>
			const preChildIds = (preReduceState.child_ids as string[] | undefined) ?? []

			type ChildOp = {
				childId: string
				presentation: 'card'
				folderId: string | undefined
			}
			let childOps: ChildOp[] = []

			if (toolName === 'add_children') {
				const addIds = (p.child_ids as string[]) ?? []
				childOps = addIds.map((childId) => ({ childId, presentation: 'card', folderId: id }))
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
