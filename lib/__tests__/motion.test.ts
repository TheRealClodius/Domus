import { describe, expect, it } from 'vitest'
import { HANDLE_TIMING } from '@/lib/motion'

describe('HANDLE_TIMING', () => {
	it('idle fades out at 0.2s ease-out', () => {
		expect(HANDLE_TIMING.idle.opacity).toBe('opacity 0.2s ease-out')
	})

	it('hover fades in at 0.2s ease-in', () => {
		expect(HANDLE_TIMING.hover.opacity).toBe('opacity 0.2s ease-in')
	})

	it('active uses faster 0.1s opacity', () => {
		expect(HANDLE_TIMING.active.opacity).toBe('opacity 0.1s ease-out')
	})

	it('idle/hover use slow 0.35s transform', () => {
		expect(HANDLE_TIMING.idle.transform).toBe('transform 0.35s ease-out')
		expect(HANDLE_TIMING.hover.transform).toBe('transform 0.35s ease-out')
	})

	it('active uses fast 0.15s transform for responsive feedback', () => {
		expect(HANDLE_TIMING.active.transform).toBe('transform 0.15s ease-out')
	})
})
