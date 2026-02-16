import type { BuiltInApp } from '@/apps/_types'
import { ulid } from '@/lib/id'
import type { Entity } from '@/lib/types'

export interface SpawnContext {
	spaceId: string
	userId: string
	entityCount: number
}

const SPAWN_CENTER = { x: 200, y: 120 }
const STACK_OFFSET = 30

export function createEntityFromApp(app: BuiltInApp, ctx: SpawnContext): Entity {
	const offset = ctx.entityCount * STACK_OFFSET

	return {
		id: ulid(),
		space_id: ctx.spaceId,
		user_id: ctx.userId,
		type: app.type,
		presentation: app.defaultPresentation,
		position: { x: SPAWN_CENTER.x + offset, y: SPAWN_CENTER.y + offset, locked: false },
		size: { ...app.defaultSize },
		z_index: ctx.entityCount + 1,
		content: '',
		state: {},
		summary: app.summarize({}),
		created_by: 'user',
		archived: false,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}
}
