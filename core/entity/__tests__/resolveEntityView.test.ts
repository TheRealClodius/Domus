import { describe, expect, it } from 'vitest'
import { resolveEntityView } from '@/core/entity/resolveEntityView'
import type { Entity } from '@/lib/types'

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'entity-1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'window',
		position: { x: 0, y: 0, locked: false },
		size: { width: 400, height: 300 },
		z_index: 1,
		content: '',
		state: {},
		summary: '',
		created_by: 'user',
		archived: false,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		...overrides,
	}
}

describe('resolveEntityView', () => {
	describe('shell resolution', () => {
		it('_code in state → window shell regardless of presentation', () => {
			expect(
				resolveEntityView(
					makeEntity({ presentation: 'card', state: { _code: 'export default {}' } }),
				),
			).toMatchObject({ shell: 'window', body: 'generated' })

			expect(
				resolveEntityView(
					makeEntity({ presentation: 'folder', state: { _code: 'export default {}' } }),
				),
			).toMatchObject({ shell: 'window', body: 'generated' })
		})

		it('presentation folder → folder shell', () => {
			expect(resolveEntityView(makeEntity({ presentation: 'folder', type: 'folder' }))).toMatchObject(
				{ shell: 'folder' },
			)
		})

		it('presentation card → card shell', () => {
			expect(resolveEntityView(makeEntity({ presentation: 'card' }))).toMatchObject({
				shell: 'card',
				mode: 'card',
			})
		})

		it('presentation window → window shell', () => {
			expect(resolveEntityView(makeEntity({ presentation: 'window' }))).toMatchObject({
				shell: 'window',
				mode: 'window',
			})
		})
	})

	describe('body resolution', () => {
		it('_code in state → generated body', () => {
			expect(
				resolveEntityView(makeEntity({ state: { _code: '<html></html>' } })),
			).toMatchObject({ body: 'generated' })
		})

		it('image type with image_url → image body', () => {
			expect(
				resolveEntityView(
					makeEntity({
						type: 'image',
						state: { image_url: 'https://example.com/a.png' },
					}),
				),
			).toMatchObject({ body: 'image' })
		})

		it('image type with src → image body', () => {
			expect(
				resolveEntityView(
					makeEntity({
						type: 'image',
						state: { src: 'https://example.com/b.png' },
					}),
				),
			).toMatchObject({ body: 'image' })
		})

		it('image type without url → builtin body (registered app)', () => {
			expect(
				resolveEntityView(makeEntity({ type: 'image', state: { generation_prompt: 'cat' } })),
			).toMatchObject({ body: 'builtin' })
		})

		it('registered app type → builtin body', () => {
			expect(resolveEntityView(makeEntity({ type: 'calendar' }))).toMatchObject({
				body: 'builtin',
			})
			expect(resolveEntityView(makeEntity({ type: 'note' }))).toMatchObject({ body: 'builtin' })
		})

		it('unknown type → fallback body', () => {
			expect(
				resolveEntityView(makeEntity({ type: 'alien-widget', presentation: 'card' })),
			).toMatchObject({ body: 'fallback', shell: 'card' })
		})
	})

	describe('type × presentation matrix', () => {
		const cases: Array<{
			label: string
			entity: Partial<Entity>
			expected: { shell: string; body: string; mode?: string }
		}> = [
			{
				label: 'calendar window',
				entity: { type: 'calendar', presentation: 'window' },
				expected: { shell: 'window', body: 'builtin', mode: 'window' },
			},
			{
				label: 'calendar card',
				entity: { type: 'calendar', presentation: 'card' },
				expected: { shell: 'card', body: 'builtin', mode: 'card' },
			},
			{
				label: 'image card with url',
				entity: {
					type: 'image',
					presentation: 'card',
					state: { image_url: 'https://example.com/x.png' },
				},
				expected: { shell: 'card', body: 'image', mode: 'card' },
			},
			{
				label: 'generated app forced to window',
				entity: {
					type: 'generated-app',
					presentation: 'card',
					state: { _code: 'console.log(1)' },
				},
				expected: { shell: 'window', body: 'generated', mode: 'window' },
			},
			{
				label: 'folder entity',
				entity: {
					type: 'folder',
					presentation: 'folder',
					state: { child_ids: ['a', 'b'] },
				},
				expected: { shell: 'folder', body: 'builtin' },
			},
			{
				label: 'unknown window',
				entity: { type: 'mystery', presentation: 'window' },
				expected: { shell: 'window', body: 'fallback', mode: 'window' },
			},
		]

		for (const { label, entity, expected } of cases) {
			it(label, () => {
				expect(resolveEntityView(makeEntity(entity))).toMatchObject(expected)
			})
		}
	})
})
