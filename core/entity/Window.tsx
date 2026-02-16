'use client'

import type React from 'react'
import { useRef, useState } from 'react'
import { useDragEntity } from '@/core/canvas/useDragEntity'
import { type ResizeDirection, useResizeEntity } from '@/core/canvas/useResizeEntity'
import AppRenderer from '@/core/entity/AppRenderer'
import ResizeHandleVisual from '@/core/entity/ResizeHandleVisual'
import { useAgentGlow } from '@/core/entity/useAgentGlow'
import WindowControl from '@/core/entity/WindowControl'
import { useEntityStore } from '@/core/entityStore'
import type { Entity } from '@/lib/types'

const RESIZE_DIRECTIONS: ResizeDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']

interface WindowProps {
	entity: Entity
	isFocused: boolean
	headerActions?: React.ReactNode
}

export default function Window({ entity, isFocused, headerActions }: WindowProps) {
	const windowRef = useRef<HTMLDivElement>(null)
	const remove = useEntityStore((s) => s.remove)
	const setFocused = useEntityStore((s) => s.setFocused)
	const glowing = useAgentGlow(entity)
	const { bind: dragBind } = useDragEntity(entity.id)
	const { getHandleProps, activeDirection, resizeBehavior } = useResizeEntity(entity.id, windowRef)
	const [hoveredHandle, setHoveredHandle] = useState<ResizeDirection | null>(null)

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Window focus requires onMouseDown on container
		<div
			ref={windowRef}
			data-agent-glow={glowing ? '' : undefined}
			onMouseDown={() => setFocused(entity.id)}
			style={{
				width: entity.size.width,
				height: entity.size.height,
				minWidth: 300,
				minHeight: 200,
				borderRadius: 20,
				isolation: 'isolate',
				contain: 'layout',
				pointerEvents: 'auto',
				boxShadow: isFocused ? 'var(--shadow-window)' : 'var(--shadow-resting)',
			}}
			className={`relative flex flex-col bg-surface-raised ${glowing ? 'shadow-agent-glow' : ''}`}
		>
			{/* Close control — positioned outside drag zone to avoid
		    @use-gesture's onClickCapture from filterTaps blocking clicks */}
			<div
				className={`absolute z-20 ${isFocused ? 'opacity-100' : 'opacity-70'}`}
				style={{ top: 4, left: 16 }}
			>
				<WindowControl onClick={() => remove(entity.id)} />
			</div>

			{/* Title bar — transparent drag zone, header actions float over content */}
			<div
				{...dragBind()}
				data-window-header=""
				className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-end h-10 px-2 py-2 cursor-grab active:cursor-grabbing ${
					isFocused ? 'opacity-100' : 'opacity-70'
				}`}
				style={{
					touchAction: 'none',
				}}
			>
				{headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
			</div>

			{/* Content area — scrolls edge-to-edge under floating header */}
			<div
				className="flex-1 overflow-auto scroll-fade pt-10 px-4 pb-10 bg-surface-raised rounded-b-2xl"
				style={{ '--scroll-fade-size': '2.5rem' } as React.CSSProperties}
			>
				<AppRenderer entity={entity} mode="window" />
			</div>

			{/* Resize hit areas — invisible, extend outside window for easy grabbing */}
			{RESIZE_DIRECTIONS.map((dir) => (
				// biome-ignore lint/a11y/noStaticElementInteractions: Resize handles need pointer events
				<div
					key={dir}
					data-resize-handle={dir}
					data-window-role="resizer"
					{...getHandleProps(dir)}
					onMouseEnter={() => setHoveredHandle(dir)}
					onMouseLeave={() => setHoveredHandle(null)}
					style={{
						...getHitAreaStyle(dir),
						touchAction: 'none',
					}}
				/>
			))}

			{/* Resize visuals — inside window, concentric with border radius */}
			{RESIZE_DIRECTIONS.map((dir) => (
				<ResizeHandleVisual
					key={`visual-${dir}`}
					direction={dir}
					state={activeDirection === dir ? 'active' : hoveredHandle === dir ? 'hover' : 'idle'}
					resizeBehavior={activeDirection === dir ? resizeBehavior : undefined}
				/>
			))}
		</div>
	)
}

function getHitAreaStyle(dir: ResizeDirection): React.CSSProperties {
	const base: React.CSSProperties = {
		position: 'absolute',
		zIndex: 1000,
		pointerEvents: 'auto',
		backgroundColor: 'transparent',
	}

	switch (dir) {
		case 'n':
			return { ...base, top: -8, left: 20, right: 20, height: 16, cursor: 'ns-resize' }
		case 's':
			return { ...base, bottom: -8, left: 20, right: 20, height: 16, cursor: 'ns-resize' }
		case 'e':
			return { ...base, right: -8, top: 20, bottom: 20, width: 16, cursor: 'ew-resize' }
		case 'w':
			return { ...base, left: -8, top: 20, bottom: 20, width: 16, cursor: 'ew-resize' }
		case 'ne':
			return { ...base, top: -8, right: -8, width: 24, height: 24, cursor: 'nesw-resize' }
		case 'nw':
			return { ...base, top: -8, left: -8, width: 24, height: 24, cursor: 'nwse-resize' }
		case 'se':
			return { ...base, bottom: -8, right: -8, width: 24, height: 24, cursor: 'nwse-resize' }
		case 'sw':
			return { ...base, bottom: -8, left: -8, width: 24, height: 24, cursor: 'nesw-resize' }
		default:
			return base
	}
}
