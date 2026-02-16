import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { detectBehavior, useResizeEntity } from '@/core/canvas/useResizeEntity'

describe('detectBehavior', () => {
	it('returns null when movement is below threshold', () => {
		expect(detectBehavior('e', 1, 0)).toBeNull()
		expect(detectBehavior('n', 0, -1)).toBeNull()
		expect(detectBehavior('se', 1, 1)).toBeNull()
	})

	it('accepts custom threshold for frame-to-frame detection', () => {
		// Default threshold (2) would return null for |1| + |0| = 1
		expect(detectBehavior('e', 1, 0)).toBeNull()
		// Custom lower threshold allows small frame-to-frame deltas
		expect(detectBehavior('e', 1, 0, 0.5)).toBe('expanding')
		expect(detectBehavior('w', -1, 0, 0.5)).toBe('expanding')
	})

	// East
	it('east handle: positive mx = expanding', () => {
		expect(detectBehavior('e', 10, 0)).toBe('expanding')
	})
	it('east handle: negative mx = contracting', () => {
		expect(detectBehavior('e', -10, 0)).toBe('contracting')
	})

	// West
	it('west handle: negative mx = expanding', () => {
		expect(detectBehavior('w', -10, 0)).toBe('expanding')
	})
	it('west handle: positive mx = contracting', () => {
		expect(detectBehavior('w', 10, 0)).toBe('contracting')
	})

	// South
	it('south handle: positive my = expanding', () => {
		expect(detectBehavior('s', 0, 10)).toBe('expanding')
	})
	it('south handle: negative my = contracting', () => {
		expect(detectBehavior('s', 0, -10)).toBe('contracting')
	})

	// North
	it('north handle: negative my = expanding', () => {
		expect(detectBehavior('n', 0, -10)).toBe('expanding')
	})
	it('north handle: positive my = contracting', () => {
		expect(detectBehavior('n', 0, 10)).toBe('contracting')
	})

	// Southeast (diagonal sum)
	it('se handle: positive sum = expanding', () => {
		expect(detectBehavior('se', 5, 5)).toBe('expanding')
	})
	it('se handle: negative sum = contracting', () => {
		expect(detectBehavior('se', -5, -5)).toBe('contracting')
	})

	// Northwest (inverted diagonal sum)
	it('nw handle: both negative = expanding', () => {
		expect(detectBehavior('nw', -5, -5)).toBe('expanding')
	})
	it('nw handle: both positive = contracting', () => {
		expect(detectBehavior('nw', 5, 5)).toBe('contracting')
	})

	// Northeast
	it('ne handle: positive mx, negative my = expanding', () => {
		expect(detectBehavior('ne', 10, -5)).toBe('expanding')
	})
	it('ne handle: negative mx, positive my = contracting', () => {
		expect(detectBehavior('ne', -10, 5)).toBe('contracting')
	})

	// Southwest
	it('sw handle: negative mx, positive my = expanding', () => {
		expect(detectBehavior('sw', -5, 10)).toBe('expanding')
	})
	it('sw handle: positive mx, negative my = contracting', () => {
		expect(detectBehavior('sw', 5, -10)).toBe('contracting')
	})
})

describe('useResizeEntity', () => {
	it('returns getHandleProps as a function', () => {
		const ref = createRef<HTMLDivElement>()
		const { result } = renderHook(() => useResizeEntity('test-id', ref))
		expect(typeof result.current.getHandleProps).toBe('function')
	})

	it('getHandleProps returns onPointerDown handler', () => {
		const ref = createRef<HTMLDivElement>()
		const { result } = renderHook(() => useResizeEntity('test-id', ref))
		const props = result.current.getHandleProps('se')
		expect(typeof props.onPointerDown).toBe('function')
	})

	it('activeDirection is null when idle', () => {
		const ref = createRef<HTMLDivElement>()
		const { result } = renderHook(() => useResizeEntity('test-id', ref))
		expect(result.current.activeDirection).toBeNull()
	})

	it('isResizing is false when idle', () => {
		const ref = createRef<HTMLDivElement>()
		const { result } = renderHook(() => useResizeEntity('test-id', ref))
		expect(result.current.isResizing).toBe(false)
	})

	it('resizeBehavior is null when idle', () => {
		const ref = createRef<HTMLDivElement>()
		const { result } = renderHook(() => useResizeEntity('test-id', ref))
		expect(result.current.resizeBehavior).toBeNull()
	})
})
