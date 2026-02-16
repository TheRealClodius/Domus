import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAutoResize } from '@/core/chat/useAutoResize'

describe('useAutoResize', () => {
	/**
	 * Create a mock textarea whose cloneNode returns an element with a
	 * controlled scrollHeight. This matches the clone-based measurement
	 * approach: the hook clones the element, appends to body, reads
	 * scrollHeight, then removes it.
	 */
	function makeTextarea(cloneScrollHeight: number): HTMLTextAreaElement {
		const el = document.createElement('textarea')
		Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true })

		el.cloneNode = () => {
			const clone = document.createElement('textarea')
			Object.defineProperty(clone, 'scrollHeight', {
				value: cloneScrollHeight,
				configurable: true,
			})
			Object.defineProperty(clone, 'offsetHeight', { value: 0, configurable: true })
			return clone
		}

		return el
	}

	it('returns needsExpand false initially', () => {
		const ref = { current: makeTextarea(35) }
		const { result } = renderHook(() => useAutoResize(ref))

		expect(result.current.needsExpand).toBe(false)
	})

	it('returns needsExpand true when content exceeds max height', () => {
		const ref = { current: makeTextarea(200) }
		const { result } = renderHook(() => useAutoResize(ref))

		act(() => result.current.measure())

		expect(result.current.needsExpand).toBe(true)
	})

	it('returns needsExpand false when ref is null', () => {
		const ref = { current: null }
		const { result } = renderHook(() => useAutoResize(ref))

		expect(result.current.needsExpand).toBe(false)
	})

	it('calculates measuredHeight capped at max (184px)', () => {
		const ref = { current: makeTextarea(300) }
		const { result } = renderHook(() => useAutoResize(ref))

		act(() => result.current.measure())

		expect(result.current.measuredHeight).toBe(184)
	})

	it('calculates measuredHeight at least min (46px)', () => {
		const ref = { current: makeTextarea(30) }
		const { result } = renderHook(() => useAutoResize(ref))

		act(() => result.current.measure())

		expect(result.current.measuredHeight).toBe(46)
	})

	it('returns needsExpand false when content fits within max', () => {
		const ref = { current: makeTextarea(100) }
		const { result } = renderHook(() => useAutoResize(ref))

		act(() => result.current.measure())

		expect(result.current.needsExpand).toBe(false)
	})

	it('reports correct measuredHeight for mid-range content', () => {
		// 3 lines worth: 23px * 3 = 69px
		const ref = { current: makeTextarea(69) }
		const { result } = renderHook(() => useAutoResize(ref))

		act(() => result.current.measure())

		expect(result.current.measuredHeight).toBe(69)
	})
})
