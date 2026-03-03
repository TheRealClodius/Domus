import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useImageTone } from '@/core/entity/useImageTone'

const originalCreateElement = document.createElement.bind(document)

function makePixelData(r: number, g: number, b: number, count: number): Uint8ClampedArray {
	const data = new Uint8ClampedArray(count * 4)
	for (let i = 0; i < count * 4; i += 4) {
		data[i] = r
		data[i + 1] = g
		data[i + 2] = b
		data[i + 3] = 255
	}
	return data
}

function mockCanvas(imageData: Uint8ClampedArray) {
	const ctx = {
		drawImage: vi.fn(),
		getImageData: vi.fn().mockReturnValue({ data: imageData }),
	}
	vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
		if (tag === 'canvas') {
			return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement
		}
		return originalCreateElement(tag)
	})
	return ctx
}

function makeImg(naturalWidth = 100, naturalHeight = 100): HTMLImageElement {
	return { naturalWidth, naturalHeight } as HTMLImageElement
}

describe('useImageTone', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('returns default dark tone when img is null', () => {
		const { result } = renderHook(() => useImageTone(null, false))
		expect(result.current).toEqual({ top: 'dark', bottom: 'dark' })
	})

	it('returns default dark tone when not loaded', () => {
		const img = makeImg()
		const { result } = renderHook(() => useImageTone(img, false))
		expect(result.current).toEqual({ top: 'dark', bottom: 'dark' })
	})

	it('detects light image as light tone', () => {
		const pixels = makePixelData(255, 255, 255, 32 * 32)
		mockCanvas(pixels)
		const img = makeImg()

		const { result } = renderHook(() => useImageTone(img, true))
		expect(result.current).toEqual({ top: 'light', bottom: 'light' })
	})

	it('detects dark image as dark tone', () => {
		const pixels = makePixelData(0, 0, 0, 32 * 32)
		mockCanvas(pixels)
		const img = makeImg()

		const { result } = renderHook(() => useImageTone(img, true))
		expect(result.current).toEqual({ top: 'dark', bottom: 'dark' })
	})

	it('detects mixed image with light top and dark bottom', () => {
		// 32x32 image: top 25% (8 rows) white, rest black
		const pixels = new Uint8ClampedArray(32 * 32 * 4)
		const topRows = 8 * 32 * 4
		for (let i = 0; i < topRows; i += 4) {
			pixels[i] = 255
			pixels[i + 1] = 255
			pixels[i + 2] = 255
			pixels[i + 3] = 255
		}
		mockCanvas(pixels)
		const img = makeImg()

		const { result } = renderHook(() => useImageTone(img, true))
		expect(result.current.top).toBe('light')
		expect(result.current.bottom).toBe('dark')
	})

	it('falls back to default on CORS SecurityError', () => {
		const ctx = {
			drawImage: vi.fn(),
			getImageData: vi.fn().mockImplementation(() => {
				throw new DOMException('tainted canvas', 'SecurityError')
			}),
		}
		vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
			if (tag === 'canvas') {
				return { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement
			}
			return originalCreateElement(tag)
		})
		const img = makeImg()

		const { result } = renderHook(() => useImageTone(img, true))
		expect(result.current).toEqual({ top: 'dark', bottom: 'dark' })
	})

	it('resamples when loaded changes from false to true', () => {
		const pixels = makePixelData(255, 255, 255, 32 * 32)
		mockCanvas(pixels)
		const img = makeImg()

		const { result, rerender } = renderHook(({ loaded }) => useImageTone(img, loaded), {
			initialProps: { loaded: false },
		})

		expect(result.current).toEqual({ top: 'dark', bottom: 'dark' })

		act(() => {
			rerender({ loaded: true })
		})

		expect(result.current).toEqual({ top: 'light', bottom: 'light' })
	})
})
