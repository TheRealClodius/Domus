/** Minimum viewport for the Domus desktop web app. */
export const MIN_VIEWPORT_WIDTH = 1280
export const MIN_VIEWPORT_HEIGHT = 720

export function isDesktopViewport(width: number, height: number): boolean {
	return width >= MIN_VIEWPORT_WIDTH && height >= MIN_VIEWPORT_HEIGHT
}
