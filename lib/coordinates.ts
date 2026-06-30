/** Canvas shell inset from browser edges — matches `CanvasShell` constants. */
export const CANVAS_INSET_REST = 12
export const CANVAS_INSET_SHEET = 20

export interface Point {
	x: number
	y: number
}

export interface CanvasRect {
	left: number
	top: number
	width: number
	height: number
}

/** Inset px when the sheet is closed (12) or open (20). */
export function canvasInset(sheetOpen: boolean): number {
	return sheetOpen ? CANVAS_INSET_SHEET : CANVAS_INSET_REST
}

/** Read `[data-testid="canvas"]` bounds, or zero rect when missing. */
export function getCanvasRect(canvasEl: HTMLElement | null): CanvasRect {
	const rect = canvasEl?.getBoundingClientRect()
	return {
		left: rect?.left ?? 0,
		top: rect?.top ?? 0,
		width: rect?.width ?? 0,
		height: rect?.height ?? 0,
	}
}

/** Viewport (client) coordinates → canvas-local coordinates. */
export function viewportToCanvas(
	viewportX: number,
	viewportY: number,
	canvasRect: Pick<CanvasRect, 'left' | 'top'>,
): Point {
	return {
		x: viewportX - canvasRect.left,
		y: viewportY - canvasRect.top,
	}
}

/** Canvas-local coordinates → viewport (client) coordinates. */
export function canvasToViewport(
	canvasX: number,
	canvasY: number,
	canvasRect: Pick<CanvasRect, 'left' | 'top'>,
): Point {
	return {
		x: canvasX + canvasRect.left,
		y: canvasY + canvasRect.top,
	}
}
