// POST /api/entities — create a new entity (agent or user)
import { NextResponse } from 'next/server'
import { resolveAuth } from '@/app/api/_auth'
import { getAppType } from '@/apps/_registry'
import { getSupabaseServiceClient } from '@/core/supabase/service'
import { getDefaultPresentation } from '@/lib/presentationRules'
import type { EntityPosition, EntitySize } from '@/lib/types'

interface CreateEntityBody {
	type?: string
	content?: string
	state?: Record<string, unknown>
	summary?: string
	position?: EntityPosition
	size?: EntitySize
	created_by?: 'user' | 'agent'
}

export async function POST(request: Request) {
	const auth = await resolveAuth(request)
	if (auth.type === 'error') {
		return NextResponse.json({ error: auth.message }, { status: auth.status })
	}

	let body: CreateEntityBody
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	const { type, content, state, summary, position, size, created_by } = body
	if (!type) {
		return NextResponse.json({ error: 'Missing type' }, { status: 400 })
	}

	const spaceId = auth.type === 'service' ? auth.space_id : undefined
	const serviceClient = getSupabaseServiceClient()

	// For user auth, resolve space_id from the user's session
	let resolvedSpaceId: string
	if (auth.type === 'service') {
		resolvedSpaceId = auth.space_id
	} else {
		// Get user's active space
		const url = new URL(request.url)
		const qSpaceId = url.searchParams.get('space_id')
		if (!qSpaceId) {
			return NextResponse.json({ error: 'Missing space_id query parameter' }, { status: 400 })
		}
		// Verify the user owns this space
		const { data: space } = await auth.supabase
			.from('spaces')
			.select('id, user_id')
			.eq('id', qSpaceId)
			.maybeSingle()
		if (!space) {
			return NextResponse.json({ error: 'forbidden' }, { status: 403 })
		}
		resolvedSpaceId = qSpaceId
	}

	const app = getAppType(type)
	// Generated apps (_code in state) are always windows regardless of type registration
	const presentation = state?._code !== undefined ? 'window' : getDefaultPresentation(type)

	// Handle singleton types: return existing entity instead of creating duplicate
	if (app?.maxInstances === 1) {
		const { data: existing } = await serviceClient
			.from('entities')
			.select('*')
			.eq('space_id', resolvedSpaceId)
			.eq('type', type)
			.eq('archived', false)
			.maybeSingle()

		if (existing) {
			return NextResponse.json(existing, { status: 200 })
		}
	}

	const defaultSize = app?.defaultSize ?? { width: 400, height: 300 }
	const defaultState = app?.initialState ?? {}

	// Get user_id for the entity
	let userId: string
	if (auth.type === 'service') {
		// For service auth, query space to get user_id
		const { data: space } = await serviceClient
			.from('spaces')
			.select('user_id')
			.eq('id', resolvedSpaceId)
			.maybeSingle()
		if (!space) {
			return NextResponse.json({ error: 'space_not_found' }, { status: 404 })
		}
		userId = space.user_id
	} else {
		userId = auth.user_id
	}

	const entity = {
		id: crypto.randomUUID(),
		space_id: resolvedSpaceId,
		user_id: userId,
		type,
		presentation,
		content: content ?? '',
		state: state ?? defaultState,
		summary: summary ?? '',
		position: position ?? { x: 100, y: 100, locked: false },
		size: size ?? defaultSize,
		z_index: 0,
		archived: false,
		created_by: created_by ?? 'agent',
	}

	const { data, error } = await serviceClient.from('entities').insert(entity).select().single()

	if (error) {
		console.error('[POST /api/entities] insert failed', error.message)
		return NextResponse.json({ error: 'create_failed' }, { status: 500 })
	}

	const schema = app?.getSchema ? { tools: app.getSchema(data.state ?? {}) } : undefined
	return NextResponse.json(
		{ ...data, ...(schema ? { schema } : {}) },
		{ status: 200 },
	)
}
