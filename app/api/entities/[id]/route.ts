// PATCH /api/entities/[id] — update entity fields with presentation coercion
// DELETE /api/entities/[id] — archive entity (folders: optionally with children via ?force=true)
import { NextResponse } from 'next/server'
import { resolveAuth } from '@/app/api/_auth'
import { getSupabaseServiceClient } from '@/core/supabase/service'
import { coercePresentation } from '@/lib/presentationRules'
import type { EntityPosition, EntitySize } from '@/lib/types'

interface UpdateEntityBody {
	content?: string
	state?: Record<string, unknown>
	summary?: string
	position?: EntityPosition
	size?: EntitySize
	presentation?: string
	archived?: boolean
}

async function resolveEntityAndAuth(
	request: Request,
	id: string,
): Promise<
	| {
			ok: true
			entity: Record<string, unknown>
			serviceClient: ReturnType<typeof getSupabaseServiceClient>
	  }
	| { ok: false; response: Response }
> {
	const auth = await resolveAuth(request)
	if (auth.type === 'error') {
		return {
			ok: false,
			response: NextResponse.json({ error: auth.message }, { status: auth.status }),
		}
	}

	const serviceClient = getSupabaseServiceClient()
	const spaceId = auth.type === 'service' ? auth.space_id : undefined

	let query = serviceClient.from('entities').select('*').eq('id', id)
	if (spaceId) {
		query = query.eq('space_id', spaceId)
	}
	const { data: entity, error } = await query.maybeSingle()

	if (error || !entity) {
		return { ok: false, response: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
	}

	// For user auth, verify space ownership
	if (auth.type === 'user') {
		const { data: space } = await auth.supabase
			.from('spaces')
			.select('id')
			.eq('id', entity.space_id)
			.maybeSingle()
		if (!space) {
			return { ok: false, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
		}
	}

	return { ok: true, entity, serviceClient }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const result = await resolveEntityAndAuth(request, id)
	if (!result.ok) return result.response

	const { entity, serviceClient } = result

	let body: UpdateEntityBody
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	const updates: Record<string, unknown> = {}

	if (body.content !== undefined) updates.content = body.content
	if (body.state !== undefined) updates.state = body.state
	if (body.summary !== undefined) updates.summary = body.summary
	if (body.position !== undefined) updates.position = body.position
	if (body.size !== undefined) updates.size = body.size
	if (body.archived !== undefined) updates.archived = body.archived

	if (body.presentation !== undefined) {
		const entityType = entity.type as string
		const entityState = entity.state as Record<string, unknown> | undefined
		// _code in current or incoming state marks a generated app → window or hidden only
		const isGenerated =
			typeof entityState?._code === 'string' || typeof body.state?._code === 'string'
		if (entityType === 'folder') {
			updates.presentation = 'folder'
		} else if (isGenerated) {
			updates.presentation = body.presentation === 'hidden' ? 'hidden' : 'window'
		} else {
			updates.presentation = coercePresentation(entityType, body.presentation)
		}
	}

	const { data, error } = await serviceClient
		.from('entities')
		.update(updates)
		.eq('id', id)
		.select()
		.single()

	if (error) {
		console.error('[PATCH /api/entities/[id]] update failed', error.message)
		return NextResponse.json({ error: 'update_failed' }, { status: 500 })
	}

	return NextResponse.json(data, { status: 200 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const result = await resolveEntityAndAuth(request, id)
	if (!result.ok) return result.response

	const { entity, serviceClient } = result

	const url = new URL(request.url)
	const force = url.searchParams.get('force') === 'true'

	// Folder-specific logic
	if (entity.type === 'folder') {
		const childIds = (entity.state as Record<string, unknown>)?.child_ids as string[] | undefined
		const hasChildren = Array.isArray(childIds) && childIds.length > 0

		if (hasChildren && !force) {
			return NextResponse.json(
				{ error: 'folder_has_children', child_ids: childIds, count: childIds.length },
				{ status: 409 },
			)
		}

		if (hasChildren && force) {
			// Archive all children
			await serviceClient.from('entities').update({ archived: true }).in('id', childIds)
		}
	}

	const { error } = await serviceClient.from('entities').update({ archived: true }).eq('id', id)

	if (error) {
		console.error('[DELETE /api/entities/[id]] archive failed', error.message)
		return NextResponse.json({ error: 'archive_failed' }, { status: 500 })
	}

	return NextResponse.json({ ok: true }, { status: 200 })
}
