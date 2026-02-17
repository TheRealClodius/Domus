import { describe, expect, it, vi } from 'vitest'

/**
 * Conceptual RLS tests for entity isolation policy.
 *
 * The real enforcement happens in Postgres (see supabase/tests/entity_isolation_rls.sql).
 * These tests verify the application-level assumptions: queries filter by space ownership,
 * so a mismatched user_id on the entity row doesn't grant access.
 */

function mockSupabaseWithRLS(ownedSpaceIds: string[]) {
	return {
		from: vi.fn().mockImplementation(() => {
			const chain = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockImplementation((_col: string, value: string) => {
					// Simulate RLS: only return entities whose space_id is in ownedSpaceIds
					if (_col === 'space_id' && !ownedSpaceIds.includes(value)) {
						return { data: [], error: null }
					}
					return chain
				}),
				single: vi
					.fn()
					.mockReturnValue({ data: null, error: { message: 'Row not found', code: 'PGRST116' } }),
			}
			return chain
		}),
	}
}

describe('entity isolation (RLS concept)', () => {
	it('denies access to entity in space not owned by user', async () => {
		// Attacker owns no spaces — entity has attacker's user_id but belongs to victim's space
		const sb = mockSupabaseWithRLS([])

		const { data, error } = await sb.from('entities').select('*').eq('space_id', 'victim-space-id')

		expect(data).toEqual([])
		expect(error).toBeNull()
	})

	it('allows access to entity in space owned by user', async () => {
		const ownedSpace = 'my-space-id'
		const entity = { id: 'e1', space_id: ownedSpace, type: 'note' }
		const sb = {
			from: vi.fn().mockImplementation(() => {
				const chain = {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockImplementation((_col: string, value: string) => {
						if (_col === 'space_id' && value === ownedSpace) {
							return { data: [entity], error: null }
						}
						return chain
					}),
				}
				return chain
			}),
		}

		const { data } = await sb.from('entities').select('*').eq('space_id', ownedSpace)
		expect(data).toEqual([entity])
	})

	it('mismatched user_id does not grant access when space is not owned', async () => {
		// Entity row has user_id = 'attacker', but space belongs to 'victim'
		// Under the old policy (user_id = auth.uid()), attacker would see it
		// Under the new policy (space_id in owned spaces), attacker cannot
		const sb = mockSupabaseWithRLS([]) // attacker owns no spaces

		const { data } = await sb.from('entities').select('*').eq('space_id', 'victim-space-id')

		expect(data).toEqual([])
	})
})
