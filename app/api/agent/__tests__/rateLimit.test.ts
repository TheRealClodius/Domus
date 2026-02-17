import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit } from '@/app/api/agent/rateLimit'

describe('checkRateLimit', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('allows 20 requests per minute per user', () => {
		for (let i = 0; i < 20; i++) {
			expect(checkRateLimit('user-1')).toEqual({ allowed: true })
		}
	})

	it('returns { allowed: false } on 21st request', () => {
		for (let i = 0; i < 20; i++) {
			checkRateLimit('user-1')
		}
		expect(checkRateLimit('user-1')).toEqual({ allowed: false })
	})

	it('resets after window expires', () => {
		for (let i = 0; i < 20; i++) {
			checkRateLimit('user-1')
		}
		expect(checkRateLimit('user-1')).toEqual({ allowed: false })

		// Advance past the 1-minute window
		vi.advanceTimersByTime(60_001)

		expect(checkRateLimit('user-1')).toEqual({ allowed: true })
	})

	it('tracks users independently', () => {
		for (let i = 0; i < 20; i++) {
			checkRateLimit('user-a')
		}
		expect(checkRateLimit('user-a')).toEqual({ allowed: false })

		// A different user should still be allowed
		expect(checkRateLimit('user-b')).toEqual({ allowed: true })
	})
})
