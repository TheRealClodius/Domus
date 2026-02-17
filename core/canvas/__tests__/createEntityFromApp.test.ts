import { describe, expect, it } from 'vitest'
import { chatApp } from '@/apps/chat'
import { createEntityFromApp } from '@/core/canvas/createEntityFromApp'

const ctx = {
	spaceId: 'space-1',
	userId: 'user-1',
	entityCount: 0,
	viewportWidth: 1280,
	viewportHeight: 800,
}

describe('createEntityFromApp', () => {
	it('returns entity with correct type, presentation, and size', () => {
		const entity = createEntityFromApp(chatApp, ctx)

		expect(entity.type).toBe('chat')
		expect(entity.presentation).toBe('window')
		expect(entity.size).toEqual({ width: 400, height: 500 })
	})

	it('offsets position by entity count', () => {
		const first = createEntityFromApp(chatApp, { ...ctx, entityCount: 0 })
		const second = createEntityFromApp(chatApp, { ...ctx, entityCount: 3 })

		expect(second.position.x).toBeGreaterThan(first.position.x)
		expect(second.position.y).toBeGreaterThan(first.position.y)
	})

	it('spawns centered in viewport', () => {
		const entity = createEntityFromApp(chatApp, { ...ctx, entityCount: 0 })

		// chatApp defaultSize is 400x500, viewport is 1280x800
		// center = (1280/2 - 400/2, 800/2 - 500/2) = (440, 150)
		expect(entity.position.x).toBe(440)
		expect(entity.position.y).toBe(150)
	})

	it('cascade wraps instead of pushing off-screen', () => {
		// With many entities, offset should wrap and stay within bounds
		const manyEntities = createEntityFromApp(chatApp, { ...ctx, entityCount: 50 })

		expect(manyEntities.position.x).toBeLessThan(ctx.viewportWidth - chatApp.defaultSize.width)
		expect(manyEntities.position.y).toBeLessThan(ctx.viewportHeight - chatApp.defaultSize.height)
		expect(manyEntities.position.x).toBeGreaterThanOrEqual(0)
		expect(manyEntities.position.y).toBeGreaterThanOrEqual(0)
	})

	it('generates a valid UUID', () => {
		const entity = createEntityFromApp(chatApp, ctx)

		expect(entity.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
	})

	it('sets created_by to user', () => {
		const entity = createEntityFromApp(chatApp, ctx)

		expect(entity.created_by).toBe('user')
	})
})
