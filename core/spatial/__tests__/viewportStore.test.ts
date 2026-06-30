import { afterEach, describe, expect, it } from 'vitest'
import {
	MAX_VIEWPORT_SCALE,
	MIN_VIEWPORT_SCALE,
	useViewportStore,
} from '@/core/spatial/viewportStore'

describe('viewportStore', () => {
	afterEach(() => {
		useViewportStore.getState().reset()
	})

	it('starts at scale 1 with zero offset', () => {
		const state = useViewportStore.getState()
		expect(state.scale).toBe(1)
		expect(state.offsetX).toBe(0)
		expect(state.offsetY).toBe(0)
	})

	it('panBy accumulates offset', () => {
		useViewportStore.getState().panBy(10, -5)
		useViewportStore.getState().panBy(3, 7)
		const state = useViewportStore.getState()
		expect(state.offsetX).toBe(13)
		expect(state.offsetY).toBe(2)
	})

	it('reset restores defaults', () => {
		useViewportStore.getState().panBy(40, 20)
		useViewportStore.getState().zoomAt(-200, { x: 100, y: 100 })
		useViewportStore.getState().reset()
		const state = useViewportStore.getState()
		expect(state.scale).toBe(1)
		expect(state.offsetX).toBe(0)
		expect(state.offsetY).toBe(0)
	})

	it('zoomAt clamps to minimum scale', () => {
		useViewportStore.getState().zoomAt(10_000, { x: 0, y: 0 })
		expect(useViewportStore.getState().scale).toBe(MIN_VIEWPORT_SCALE)
	})

	it('zoomAt clamps to maximum scale', () => {
		useViewportStore.getState().zoomAt(-10_000, { x: 0, y: 0 })
		expect(useViewportStore.getState().scale).toBe(MAX_VIEWPORT_SCALE)
	})

	it('zoomAt keeps the anchor point fixed in canvas space', () => {
		useViewportStore.getState().panBy(30, 40)
		const anchor = { x: 200, y: 150 }

		useViewportStore.getState().zoomAt(-120, anchor)

		const { scale, offsetX, offsetY } = useViewportStore.getState()
		const canvasX = (anchor.x - offsetX) / scale
		const canvasY = (anchor.y - offsetY) / scale

		expect(canvasX).toBeCloseTo((anchor.x - 30) / 1)
		expect(canvasY).toBeCloseTo((anchor.y - 40) / 1)
	})

	it('zoomAt anchor math holds after multiple zoom steps', () => {
		const anchor = { x: 320, y: 240 }
		const before = useViewportStore.getState()
		const canvasX = (anchor.x - before.offsetX) / before.scale
		const canvasY = (anchor.y - before.offsetY) / before.scale

		useViewportStore.getState().zoomAt(-80, anchor)
		useViewportStore.getState().zoomAt(-80, anchor)
		useViewportStore.getState().zoomAt(40, anchor)

		const after = useViewportStore.getState()
		expect((anchor.x - after.offsetX) / after.scale).toBeCloseTo(canvasX)
		expect((anchor.y - after.offsetY) / after.scale).toBeCloseTo(canvasY)
	})
})
