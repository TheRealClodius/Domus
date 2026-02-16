// Thumbnail generation for prompt input chips.
// Chips are 56×45px — we generate 2× for retina (112×90).

const THUMB_WIDTH = 112
const THUMB_HEIGHT = 90

/**
 * Generate a small thumbnail data URL from an image File.
 * Uses canvas to resize before encoding — a 4MB photo becomes ~2-5KB.
 * Returns undefined for non-image files or on error.
 */
export function generateThumbnail(file: File): Promise<string | undefined> {
	if (!file.type.startsWith('image/')) return Promise.resolve(undefined)

	return new Promise((resolve) => {
		const url = URL.createObjectURL(file)
		const img = new Image()

		img.onload = () => {
			// Cover-fit: scale to fill the thumbnail, then center-crop
			const scale = Math.max(THUMB_WIDTH / img.width, THUMB_HEIGHT / img.height)
			const sw = THUMB_WIDTH / scale
			const sh = THUMB_HEIGHT / scale
			const sx = (img.width - sw) / 2
			const sy = (img.height - sh) / 2

			const canvas = document.createElement('canvas')
			canvas.width = THUMB_WIDTH
			canvas.height = THUMB_HEIGHT
			const ctx = canvas.getContext('2d')
			if (!ctx) {
				URL.revokeObjectURL(url)
				resolve(undefined)
				return
			}

			ctx.drawImage(img, sx, sy, sw, sh, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)
			URL.revokeObjectURL(url)

			// JPEG for smaller size (photos don't need transparency)
			resolve(canvas.toDataURL('image/jpeg', 0.8))
		}

		img.onerror = () => {
			URL.revokeObjectURL(url)
			resolve(undefined)
		}

		img.src = url
	})
}
