import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useAgentGlow } from '@/core/entity/useAgentGlow'

describe('useAgentGlow', () => {
	it('returns true for a recent agent-created entity', () => {
		const now = new Date().toISOString()
		const { result } = renderHook(() => useAgentGlow({ created_by: 'agent', updated_at: now }))
		expect(result.current).toBe(true)
	})

	it('returns false for a user-created entity', () => {
		const now = new Date().toISOString()
		const { result } = renderHook(() => useAgentGlow({ created_by: 'user', updated_at: now }))
		expect(result.current).toBe(false)
	})

	it('returns false for an old agent-created entity', () => {
		const old = new Date(Date.now() - 60_000).toISOString()
		const { result } = renderHook(() => useAgentGlow({ created_by: 'agent', updated_at: old }))
		expect(result.current).toBe(false)
	})

	it('returns true when forcePending is true regardless of created_by', () => {
		const old = new Date(Date.now() - 60_000).toISOString()
		const { result } = renderHook(() =>
			useAgentGlow({ created_by: 'user', updated_at: old, forcePending: true }),
		)
		expect(result.current).toBe(true)
	})

	it('returns true when forcePending is true even for old agent entity', () => {
		const old = new Date(Date.now() - 60_000).toISOString()
		const { result } = renderHook(() =>
			useAgentGlow({ created_by: 'agent', updated_at: old, forcePending: true }),
		)
		expect(result.current).toBe(true)
	})
})
