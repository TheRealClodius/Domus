import { describe, expect, test } from 'vitest'

import { ulid } from '@/lib/id'

const CROCKFORD_BASE32 = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]+$/

describe('ulid', () => {
	test('generates a string of exactly 26 characters', () => {
		const id = ulid()
		expect(id).toHaveLength(26)
	})

	test('characters are valid Crockford base32 (uppercase)', () => {
		const id = ulid()
		expect(id).toMatch(CROCKFORD_BASE32)
	})

	test('two IDs generated sequentially are different', () => {
		const a = ulid()
		const b = ulid()
		expect(a).not.toBe(b)
	})

	test('IDs are lexicographically sortable (earlier < later)', async () => {
		const first = ulid()
		// small delay to guarantee different timestamp component
		await new Promise((resolve) => setTimeout(resolve, 2))
		const second = ulid()
		expect(first < second).toBe(true)
	})
})
