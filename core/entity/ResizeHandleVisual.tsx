import type { ResizeBehavior, ResizeDirection } from '@/core/canvas/useResizeEntity'
import { HANDLE_TIMING } from '@/lib/motion'

type HandleState = 'idle' | 'hover' | 'active'

interface ResizeHandleVisualProps {
	direction: ResizeDirection
	state: HandleState
	resizeBehavior?: ResizeBehavior
}

const CORNER_PATHS: Record<string, string> = {
	nw: 'M 2 18 C 2 9.16 9.16 2 18 2',
	ne: 'M 2 2 C 10.84 2 18 9.16 18 18',
	se: 'M 18 2 C 18 10.84 10.84 18 2 18',
	sw: 'M 2 2 C 2 10.84 9.16 18 18 18',
}

const CORNERS = new Set(['nw', 'ne', 'se', 'sw'])
const VERTICAL_EDGES = new Set(['e', 'w'])

/** Default inset from window edge (concentric with 20px border-radius) */
const DEFAULT_INSET = 4
/** Inset when expanding — closer to edge */
const EXPANDING_INSET = 2
/** Inset when contracting — further from edge */
const CONTRACTING_INSET = 6

function getInset(state: HandleState, resizeBehavior: ResizeBehavior | undefined): number {
	if (state === 'active' && resizeBehavior) {
		return resizeBehavior === 'expanding' ? EXPANDING_INSET : CONTRACTING_INSET
	}
	return DEFAULT_INSET
}

function getPosition(
	direction: ResizeDirection,
	inset: number,
	scale: number,
): React.CSSProperties {
	const px = `${inset}px`
	switch (direction) {
		case 'nw':
			return { top: px, left: px }
		case 'ne':
			return { top: px, right: px }
		case 'se':
			return { bottom: px, right: px }
		case 'sw':
			return { bottom: px, left: px }
		case 'n':
			return { top: px, left: '50%', transform: `translateX(-50%) scale(${scale})` }
		case 's':
			return { bottom: px, left: '50%', transform: `translateX(-50%) scale(${scale})` }
		case 'e':
			return { right: px, top: '50%', transform: `translateY(-50%) scale(${scale})` }
		case 'w':
			return { left: px, top: '50%', transform: `translateY(-50%) scale(${scale})` }
	}
}

function getTransition(state: HandleState): string {
	const timing = HANDLE_TIMING[state === 'active' ? 'active' : state === 'hover' ? 'hover' : 'idle']
	return `${timing.opacity}, ${timing.transform}, ${timing.inset}`
}

export default function ResizeHandleVisual({
	direction,
	state,
	resizeBehavior,
}: ResizeHandleVisualProps) {
	const isCorner = CORNERS.has(direction)
	const isVerticalEdge = VERTICAL_EDGES.has(direction)

	const opacity = state === 'idle' ? 0 : 1
	const scale =
		state === 'active' && resizeBehavior ? (resizeBehavior === 'expanding' ? 1.05 : 0.95) : 1
	const inset = getInset(state, resizeBehavior)
	const position = getPosition(direction, inset, scale)

	const containerStyle: React.CSSProperties = {
		position: 'absolute',
		...position,
		zIndex: 20,
		pointerEvents: 'none',
		opacity,
		transform: position.transform || (scale !== 1 ? `scale(${scale})` : undefined),
		transition: getTransition(state),
	}

	if (isCorner) {
		return (
			<div style={containerStyle} data-resize-visual={direction}>
				<svg
					aria-hidden="true"
					viewBox="0 0 20 20"
					width={20}
					height={20}
					style={{ display: 'block' }}
					className="text-on-surface-muted"
				>
					<path
						d={CORNER_PATHS[direction]}
						fill="none"
						stroke="currentColor"
						strokeWidth={4}
						strokeLinecap="round"
					/>
				</svg>
			</div>
		)
	}

	// Edge handles
	const viewBox = isVerticalEdge ? '0 0 4 36' : '0 0 36 4'
	const width = isVerticalEdge ? 4 : 36
	const height = isVerticalEdge ? 36 : 4

	return (
		<div style={containerStyle} data-resize-visual={direction}>
			<svg
				aria-hidden="true"
				viewBox={viewBox}
				width={width}
				height={height}
				style={{ display: 'block' }}
				className="text-on-surface-muted"
			>
				{isVerticalEdge ? (
					<line
						x1={2}
						y1={2}
						x2={2}
						y2={34}
						stroke="currentColor"
						strokeWidth={4}
						strokeLinecap="round"
					/>
				) : (
					<line
						x1={34}
						y1={2}
						x2={2}
						y2={2}
						stroke="currentColor"
						strokeWidth={4}
						strokeLinecap="round"
					/>
				)}
			</svg>
		</div>
	)
}
