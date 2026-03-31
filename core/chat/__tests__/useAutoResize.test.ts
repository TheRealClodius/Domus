import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, type Mock, vi } from 'vitest'
import { useAutoResize } from '@/core/chat/useAutoResize'
import { measureTextHeight } from '@/lib/textMeasure'

vi.mock('@/lib/textMeasure', () => ({
	measureTextHeight: vi.fn(() => 46),
}))

const mockMeasure = measureTextHeight as Mock

describe('useAutoResize', () => {
	function makeTextarea(value = ''): HTMLTextAreaElement {
		const el = document.createElement('textarea')
		el.value = value
		Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true })
		return el
	}

	it('returns needsExpand false initially', () => {
		const ref = { current: makeTextarea() }
		const { result } = renderHook(() => useAutoResize(ref))

		expect(result.current.needsExpand).toBe(false)
	})

	it('returns needsExpand true when content exceeds max height', () => {
		mockMeasure.mockReturnValue(200)
		const ref = { current: makeTextarea('long text') }
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
		mockMeasure.mockReturnValue(300)
		const ref = { current: makeTextarea('long text') }
		const { result } = renderHook(() => useAutoResize(ref))

		act(() => result.current.measure())

		expect(result.current.measuredHeight).toBe(184)
	})

	it('calculates measuredHeight at least min (46px)', () => {
		mockMeasure.mockReturnValue(30)
		const ref = { current: makeTextarea('x') }
		const { result } = renderHook(() => useAutoResize(ref))

		act(() => result.current.measure())

		expect(result.current.measuredHeight).toBe(46)
	})

	it('returns needsExpand false when content fits within max', () => {
		mockMeasure.mockReturnValue(100)
		const ref = { current: makeTextarea('some text') }
		const { result } = renderHook(() => useAutoResize(ref))

		act(() => result.current.measure())

		expect(result.current.needsExpand).toBe(false)
	})

	it('reports correct measuredHeight for mid-range content', () => {
		// 3 lines worth: 23px * 3 = 69px
		mockMeasure.mockReturnValue(69)
		const ref = { current: makeTextarea('three lines') }
		const { result } = renderHook(() => useAutoResize(ref))

		act(() => result.current.measure())

		expect(result.current.measuredHeight).toBe(69)
	})
})
