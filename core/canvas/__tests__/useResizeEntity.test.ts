import { act, renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { detectBehavior, useResizeEntity } from '@/core/canvas/useResizeEntity'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

function makeEntity(overrides: Partial<Entity> = {}): Entity {
	return {
		id: 'e1',
		space_id: 'space-1',
		user_id: 'user-1',
		type: 'note',
		presentation: 'window',
		position: { x: 100, y: 200, locked: false },
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
	beforeEach(() => {
		useEntityStore.setState({ entities: {}, focusedId: null })
		document.body.style.cursor = ''
		document.body.style.userSelect = ''
		document.body.innerHTML = ''
	})

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

	it('removes pointer listeners with the same function references on pointerup', () => {
		useEntityStore.getState().upsert(makeEntity({ id: 'e1' }))

		const setPointerCapture = vi.fn()
		const releasePointerCapture = vi.fn()
		const addEventListener = vi.fn()
		const removeEventListener = vi.fn()
		const handleEl = {
			parentElement: { parentElement: { style: { transform: '' } } },
			setPointerCapture,
			releasePointerCapture,
			addEventListener,
			removeEventListener,
		} as unknown as HTMLElement

		const stopPropagation = vi.fn()
		const preventDefault = vi.fn()
		const ref = createRef<HTMLDivElement>()
		ref.current = { style: { width: '', height: '' } } as unknown as HTMLDivElement
		const { result } = renderHook(() => useResizeEntity('e1', ref))

		const onPointerDown = result.current.getHandleProps('se').onPointerDown
		act(() =>
			onPointerDown({
				pointerId: 11,
				clientX: 200,
				clientY: 120,
				preventDefault,
				stopPropagation,
				currentTarget: handleEl,
			} as Parameters<typeof onPointerDown>[0]),
		)

		const pointerMoveHandler = addEventListener.mock.calls.find(
			([eventName]) => eventName === 'pointermove',
		)?.[1] as ((e: PointerEvent) => void) | undefined
		const pointerUpHandler = addEventListener.mock.calls.find(
			([eventName]) => eventName === 'pointerup',
		)?.[1] as ((e: PointerEvent) => void) | undefined

		expect(pointerMoveHandler).toBeTypeOf('function')
		expect(pointerUpHandler).toBeTypeOf('function')

		act(() =>
			pointerUpHandler?.({
				currentTarget: handleEl,
				pointerId: 11,
			} as PointerEvent),
		)

		expect(removeEventListener).toHaveBeenCalledWith('pointermove', pointerMoveHandler)
		expect(removeEventListener).toHaveBeenCalledWith('pointerup', pointerUpHandler)
		expect(releasePointerCapture).toHaveBeenCalledWith(11)
	})

	it('cleans up body styles and pending RAF when unmounted mid-resize', () => {
		const requestSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 41)
		const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
		useEntityStore.getState().upsert(makeEntity({ id: 'e1' }))

		const setPointerCapture = vi.fn()
		const addEventListener = vi.fn()
		const handleEl = {
			parentElement: { parentElement: { style: { transform: '' } } },
			setPointerCapture,
			releasePointerCapture: vi.fn(),
			addEventListener,
			removeEventListener: vi.fn(),
		} as unknown as HTMLElement

		const ref = createRef<HTMLDivElement>()
		ref.current = { style: { width: '', height: '' } } as unknown as HTMLDivElement
		const { result, unmount } = renderHook(() => useResizeEntity('e1', ref))

		const onPointerDown = result.current.getHandleProps('se').onPointerDown
		act(() =>
			onPointerDown({
				pointerId: 3,
				clientX: 300,
				clientY: 200,
				preventDefault: vi.fn(),
				stopPropagation: vi.fn(),
				currentTarget: handleEl,
			} as Parameters<typeof onPointerDown>[0]),
		)

		const pointerMoveHandler = addEventListener.mock.calls.find(
			([eventName]) => eventName === 'pointermove',
		)?.[1] as ((e: PointerEvent) => void) | undefined

		act(() =>
			pointerMoveHandler?.({
				clientX: 320,
				clientY: 240,
			} as PointerEvent),
		)

		expect(requestSpy).toHaveBeenCalled()
		expect(document.body.style.userSelect).toBe('none')
		expect(document.body.style.cursor).toBe('nwse-resize')

		act(() => unmount())

		expect(cancelSpy).toHaveBeenCalledWith(41)
		expect(document.body.style.userSelect).toBe('')
		expect(document.body.style.cursor).toBe('')
		requestSpy.mockRestore()
		cancelSpy.mockRestore()
	})
})
