// SPIKE: entity-as-mcp — GET /api/entities/[id]/schema
// Returns MCP tool schemas for an entity based on its app type and current state.
import { NextResponse } from 'next/server'
import { resolveAuth } from '@/app/api/_auth'
import { getAppType } from '@/apps/_registry'
import { getSupabaseServiceClient } from '@/core/supabase/service'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const auth = await resolveAuth(request)
	if (auth.type === 'error') {
		return NextResponse.json({ error: auth.message }, { status: auth.status })
	}

	// Read entity — service client for service auth, user's client for cookie auth
	const supabase = auth.type === 'service' ? getSupabaseServiceClient() : auth.supabase
	const spaceId = auth.type === 'service' ? auth.space_id : undefined

	let query = supabase.from('entities').select('id, type, state, space_id').eq('id', id)
	if (spaceId) {
		query = query.eq('space_id', spaceId)
	}
	const { data: entity, error } = await query.maybeSingle()

	if (error || !entity) {
		return NextResponse.json({ error: 'not_found' }, { status: 404 })
	}

	// For cookie auth, verify the user owns this entity's space
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

	// System app: compute schema from app definition
	const app = getAppType(entity.type)
	if (app?.getSchema) {
		const tools = app.getSchema(entity.state ?? {})
		return NextResponse.json({ entity_id: id, type: entity.type, tools })
	}

	// Generated app: read static schema from entity state
	const schema = entity.state?._schema as Array<Record<string, unknown>> | undefined
	if (schema && Array.isArray(schema)) {
		return NextResponse.json({ entity_id: id, type: entity.type, tools: schema })
	}

	return NextResponse.json({ error: 'no_schema', type: entity.type }, { status: 422 })
}
