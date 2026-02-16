import { describe, expect, it } from 'vitest'
import { chatApp } from '@/apps/chat'
import { createEntityFromApp } from '@/core/canvas/createEntityFromApp'

const ctx = { spaceId: 'space-1', userId: 'user-1', entityCount: 0 }

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

	it('generates a valid ULID (26 chars)', () => {
		const entity = createEntityFromApp(chatApp, ctx)

		expect(entity.id).toHaveLength(26)
	})

	it('sets created_by to user', () => {
		const entity = createEntityFromApp(chatApp, ctx)

		expect(entity.created_by).toBe('user')
	})
})
