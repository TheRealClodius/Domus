import type { BuiltInApp } from '@/apps/_types'
import type { Entity } from '@/lib/types'

export interface SpawnContext {
	spaceId: string
	userId: string
	entityCount: number
	viewportWidth: number
	viewportHeight: number
}

const STACK_OFFSET = 30
const PADDING = 40

export function createEntityFromApp(app: BuiltInApp, ctx: SpawnContext): Entity {
	const { width, height } = app.defaultSize
	const centerX = Math.round(ctx.viewportWidth / 2 - width / 2)
	const centerY = Math.round(ctx.viewportHeight / 2 - height / 2)

	const maxOffsetX = Math.max(ctx.viewportWidth - width - PADDING - centerX, 0)
	const maxOffsetY = Math.max(ctx.viewportHeight - height - PADDING - centerY, 0)
	const maxOffset = Math.max(Math.min(maxOffsetX, maxOffsetY), 1)

	const rawOffset = ctx.entityCount * STACK_OFFSET
	const offset = rawOffset % maxOffset

	return {
		id: crypto.randomUUID(),
		space_id: ctx.spaceId,
		user_id: ctx.userId,
		type: app.type,
		presentation: app.defaultPresentation,
		position: { x: centerX + offset, y: centerY + offset, locked: false },
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
