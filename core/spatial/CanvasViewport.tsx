'use client'

import {
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
	type WheelEvent as ReactWheelEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'
import { useViewportStore } from '@/core/spatial/viewportStore'

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false
	const tag = target.tagName
	return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

export default function CanvasViewport({ children }: { children: ReactNode }) {
	const scale = useViewportStore((s) => s.scale)
	const offsetX = useViewportStore((s) => s.offsetX)
	const offsetY = useViewportStore((s) => s.offsetY)
	const panBy = useViewportStore((s) => s.panBy)
	const zoomAt = useViewportStore((s) => s.zoomAt)

	const containerRef = useRef<HTMLDivElement>(null)
	const panningRef = useRef(false)
	const lastPointerRef = useRef({ x: 0, y: 0 })
	const [spaceHeld, setSpaceHeld] = useState(false)
	const [isPanning, setIsPanning] = useState(false)

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.code !== 'Space' || event.repeat || isEditableTarget(event.target)) return
			event.preventDefault()
			setSpaceHeld(true)
		}

		const onKeyUp = (event: KeyboardEvent) => {
			if (event.code !== 'Space') return
			setSpaceHeld(false)
			panningRef.current = false
			setIsPanning(false)
		}

		window.addEventListener('keydown', onKeyDown)
		window.addEventListener('keyup', onKeyUp)
		return () => {
			window.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('keyup', onKeyUp)
		}
	}, [])

	const onWheel = useCallback(
		(event: ReactWheelEvent<HTMLDivElement>) => {
			event.preventDefault()
			const rect = containerRef.current?.getBoundingClientRect()
			if (!rect) return

			zoomAt(event.deltaY, {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
			})
		},
		[zoomAt],
	)

	const onPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			const middleButton = event.button === 1
			const spaceLeftButton = spaceHeld && event.button === 0
			if (!middleButton && !spaceLeftButton) return

			event.preventDefault()
			panningRef.current = true
			setIsPanning(true)
			lastPointerRef.current = { x: event.clientX, y: event.clientY }
			containerRef.current?.setPointerCapture(event.pointerId)
		},
		[spaceHeld],
	)

	const onPointerMove = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			if (!panningRef.current) return

			const dx = event.clientX - lastPointerRef.current.x
			const dy = event.clientY - lastPointerRef.current.y
			lastPointerRef.current = { x: event.clientX, y: event.clientY }
			panBy(dx, dy)
		},
		[panBy],
	)

	const endPan = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		if (!panningRef.current) return
		panningRef.current = false
		setIsPanning(false)
		if (containerRef.current?.hasPointerCapture(event.pointerId)) {
			containerRef.current.releasePointerCapture(event.pointerId)
		}
	}, [])

	const cursor =
		isPanning ? 'grabbing' : spaceHeld ? 'grab' : undefined

	return (
		<div
			ref={containerRef}
			data-testid="canvas-viewport"
			onWheel={onWheel}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={endPan}
			onPointerCancel={endPan}
			style={{
				width: '100%',
				height: '100%',
				overflow: 'hidden',
				touchAction: 'none',
				cursor,
			}}
		>
			<div
				style={{
					width: '100%',
					height: '100%',
					transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
					transformOrigin: '0 0',
				}}
			>
				{children}
			</div>
		</div>
	)
}
