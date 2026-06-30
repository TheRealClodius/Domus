import { create } from 'zustand'

export const MIN_VIEWPORT_SCALE = 0.25
export const MAX_VIEWPORT_SCALE = 2

const ZOOM_SENSITIVITY = 0.001

export interface ViewportPoint {
	x: number
	y: number
}

interface ViewportState {
	scale: number
	offsetX: number
	offsetY: number
	panBy: (dx: number, dy: number) => void
	zoomAt: (deltaY: number, anchor: ViewportPoint) => void
	reset: () => void
}

function clampScale(scale: number): number {
	return Math.min(MAX_VIEWPORT_SCALE, Math.max(MIN_VIEWPORT_SCALE, scale))
}

export const useViewportStore = create<ViewportState>((set) => ({
	scale: 1,
	offsetX: 0,
	offsetY: 0,

	panBy: (dx, dy) => {
		set((state) => ({
			offsetX: state.offsetX + dx,
			offsetY: state.offsetY + dy,
		}))
	},

	zoomAt: (deltaY, anchor) => {
		set((state) => {
			const nextScale = clampScale(state.scale * (1 - deltaY * ZOOM_SENSITIVITY))
			const canvasX = (anchor.x - state.offsetX) / state.scale
			const canvasY = (anchor.y - state.offsetY) / state.scale

			return {
				scale: nextScale,
				offsetX: anchor.x - canvasX * nextScale,
				offsetY: anchor.y - canvasY * nextScale,
			}
		})
	},

	reset: () => {
		set({ scale: 1, offsetX: 0, offsetY: 0 })
	},
}))
