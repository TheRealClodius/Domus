import { useEffect, useState } from 'react'

export type Tone = 'light' | 'dark'
export type ImageTone = { top: Tone; bottom: Tone }

const DEFAULT_TONE: ImageTone = { top: 'dark', bottom: 'dark' }
const SAMPLE_WIDTH = 32
const LUMINANCE_THRESHOLD = 0.6

function averageLuminance(data: Uint8ClampedArray, start: number, end: number): number {
	let sum = 0
	let count = 0
	for (let i = start; i < end; i += 4) {
		sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
		count++
	}
	return count > 0 ? sum / count / 255 : 0
}

export function useImageTone(img: HTMLImageElement | null, loaded: boolean): ImageTone {
	const [tone, setTone] = useState<ImageTone>(DEFAULT_TONE)

	useEffect(() => {
		if (!img || !loaded || !img.naturalWidth) {
			setTone(DEFAULT_TONE)
			return
		}

		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const aspect = img.naturalHeight / img.naturalWidth
		const h = Math.round(SAMPLE_WIDTH * aspect)
		canvas.width = SAMPLE_WIDTH
		canvas.height = h

		ctx.drawImage(img, 0, 0, SAMPLE_WIDTH, h)

		try {
			const { data } = ctx.getImageData(0, 0, SAMPLE_WIDTH, h)
			const pixelsPerRow = SAMPLE_WIDTH * 4
			const topEnd = Math.round(h * 0.25) * pixelsPerRow
			const bottomStart = Math.round(h * 0.67) * pixelsPerRow
			const totalBytes = h * pixelsPerRow

			const topLum = averageLuminance(data, 0, topEnd)
			const bottomLum = averageLuminance(data, bottomStart, totalBytes)

			setTone({
				top: topLum > LUMINANCE_THRESHOLD ? 'light' : 'dark',
				bottom: bottomLum > LUMINANCE_THRESHOLD ? 'light' : 'dark',
			})
		} catch {
			// CORS-tainted canvas — fall back silently
			setTone(DEFAULT_TONE)
		}
	}, [img, loaded])

	return tone
}
