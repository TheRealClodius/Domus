import { layout, prepare } from '@chenglou/pretext'

// Matches textarea styles: 14px Inter, 23px line-height, pre-wrap
const FONT = '14px Inter'
const LINE_HEIGHT_PX = 23

/**
 * Measure the rendered height of text as it would appear in a textarea.
 * Uses pretext's canvas-based measurement — no DOM cloning, no reflow.
 *
 * @param text - The text content to measure
 * @param maxWidthPx - Available width for text content (excluding padding)
 * @param paddingVerticalPx - Total vertical padding (top + bottom)
 */
export function measureTextHeight(
	text: string,
	maxWidthPx: number,
	paddingVerticalPx: number,
): number {
	if (!text) return paddingVerticalPx
	const prepared = prepare(text, FONT, { whiteSpace: 'pre-wrap' })
	const { height } = layout(prepared, maxWidthPx, LINE_HEIGHT_PX)
	return height + paddingVerticalPx
}

/**
 * Check whether text would fit within a given height constraint.
 */
export function textFitsInHeight(
	text: string,
	maxWidthPx: number,
	maxHeightPx: number,
	paddingVerticalPx: number,
): boolean {
	return measureTextHeight(text, maxWidthPx, paddingVerticalPx) <= maxHeightPx
}
