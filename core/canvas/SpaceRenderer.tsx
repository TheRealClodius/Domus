'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getAppType, getDockApps } from '@/apps/_registry'
import AppDock from '@/core/canvas/AppDock'
import { createEntityFromApp } from '@/core/canvas/createEntityFromApp'
import SpaceHeader, { type SpaceHeaderUser } from '@/core/canvas/SpaceHeader'
import CanvasCard from '@/core/entity/CanvasCard'
import FolderStack from '@/core/entity/FolderStack'
import Window from '@/core/entity/Window'
import { useEntityStore } from '@/core/entityStore'
import { SPRING } from '@/lib/motion'
import SpatialDebugPanel from '@/core/spatial/SpatialDebugPanel'

const dockApps = getDockApps()

/**
 * Tracks entity IDs that should skip position animation (instant move).
 * Stored in Zustand so React sees it as state and re-renders synchronously.
 *
 * THE SNAP-BACK BUG (documented for future reference):
 * When drag uses translate3d for 60fps then clears transform on release,
 * Framer Motion sees old CSS position → new position and ANIMATES the gap.
 * Entity visually snaps back to old pos then slides to new. Fix: mark the
 * entity as "skip animation" BEFORE updating position. Clear the mark after
 * React has rendered with the new position (use setTimeout, not rAF — React
 * batching can defer renders past rAF).
 *
 * This pattern recurs anywhere a visual position diverges from store position:
 * - User drag (translate3d during drag, CSS left/top after)
 * - Resize drag (same pattern)
 * - Any direct DOM manipulation that desyncs from Framer Motion's internal state
 */
const skipAnimationIds = new Set<string>()

export function markJustDragged(id: string) {
	skipAnimationIds.add(id)
	// Use setTimeout(0) — runs after React's synchronous render from the
	// Zustand update that follows this call. rAF is unreliable because
	// React 19 can batch and defer renders past a single animation frame.
	setTimeout(() => {
		skipAnimationIds.delete(id)
	}, 0)
}

function getEntityTransition(entityId: string) {
	if (skipAnimationIds.has(entityId)) {
		return {
			opacity: SPRING.popIn,
			scale: SPRING.popIn,
			y: SPRING.popIn,
			left: { duration: 0 },
			top: { duration: 0 },
			width: { duration: 0 },
			height: { duration: 0 },
		}
	}
	return {
		opacity: SPRING.popIn,
		scale: SPRING.popIn,
		y: SPRING.popIn,
		left: SPRING.agent,
		top: SPRING.agent,
		width: SPRING.agent,
		height: SPRING.agent,
	}
}

interface SpaceRendererProps {
	spaceId: string
	userId?: string
	spaceName?: string
	user?: SpaceHeaderUser
}

export default function SpaceRenderer({ spaceId, userId, spaceName, user }: SpaceRendererProps) {
	const canvasRef = useRef<HTMLDivElement>(null)
	const entities = useEntityStore((s) => s.entities)
	const focusedId = useEntityStore((s) => s.focusedId)
	const setFocused = useEntityStore((s) => s.setFocused)
	const upsert = useEntityStore((s) => s.upsert)
	const updatePresentation = useEntityStore((s) => s.updatePresentation)

	const visible = Object.values(entities).filter((e) => e.presentation !== 'hidden' && !e.archived)

	const handleDockClick = useCallback(
		(appType: string) => {
			const app = dockApps.find((a) => a.type === appType)
			if (!app) return

			if (app.maxInstances === 1) {
				const current = useEntityStore.getState().entities
				const existing = Object.values(current).find((e) => e.type === appType && !e.archived)
				if (existing) {
					if (existing.presentation === 'hidden') {
						updatePresentation(existing.id, app.defaultPresentation)
					}
					setFocused(existing.id)
					return
				}
			}

			const entity = createEntityFromApp(app, {
				spaceId,
				userId: userId ?? 'mock-user',
				entityCount: Object.keys(entities).length,
				viewportWidth: canvasRef.current?.clientWidth ?? window.innerWidth,
				viewportHeight: canvasRef.current?.clientHeight ?? window.innerHeight,
			})
			upsert(entity)
			setFocused(entity.id)
		},
		[spaceId, userId, entities, upsert, setFocused, updatePresentation],
	)

	const dockItems = dockApps.map((app) => ({
		icon: <app.icon className="size-5" />,
		label: app.name,
		onClick: () => handleDockClick(app.type),
	}))

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Canvas background click clears focus
		<div
			ref={canvasRef}
			data-testid="canvas"
			className="relative w-full h-full bg-surface-sunken overflow-hidden"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) setFocused(null)
			}}
		>
			{/* Space header — full width above canvas */}
			<SpaceHeader spaceName={spaceName ?? 'My Space'} user={user} />

			{/* App dock — left edge, vertically centered */}
			<div
				data-testid="app-dock-container"
				className="absolute left-3 top-1/2 -translate-y-1/2"
				style={{ zIndex: 20, pointerEvents: 'auto' }}
			>
				<AppDock items={dockItems} />
			</div>

			{/* SPIKE: Debug panel for spatial recipes */}
			<SpatialDebugPanel canvasRef={canvasRef} spaceId={spaceId} userId={userId} />

			{visible.length === 0 ? (
				<div className="flex items-center justify-center h-full">
					<p className="text-on-surface-muted">Talk to the agent or open an app from the dock.</p>
				</div>
			) : (
				/* Window area — pointer-events: none, individual entities opt in */
				<div
					data-testid="window-area"
					style={{
						position: 'absolute',
						inset: 0,
						zIndex: 10,
						pointerEvents: 'none',
					}}
				>
					<AnimatePresence>
						{visible.map((entity) => (
							<motion.div
								key={entity.id}
								data-entity-wrapper
								initial={{
									opacity: 0,
									scale: 0.98,
									y: 8,
									left: entity.position.x,
									top: entity.position.y,
									width: entity.size.width,
									height: entity.size.height,
								}}
								animate={{
									opacity: 1,
									scale: 1,
									y: 0,
									left: entity.position.x,
									top: entity.position.y,
									width: entity.size.width,
									height: entity.size.height,
								}}
								exit={{ opacity: 0, scale: 0.98, y: 8 }}
								transition={getEntityTransition(entity.id)}
								style={{
									position: 'absolute',
									zIndex: entity.z_index,
								}}
							>
								{entity.presentation === 'window' ? (
									(() => {
										const app = getAppType(entity.type)
										const Actions = app?.windowActions
										return (
											<Window
												entity={entity}
												isFocused={focusedId === entity.id}
												headerActions={Actions ? <Actions entityId={entity.id} /> : undefined}
											/>
										)
									})()
								) : entity.presentation === 'card' ? (
									<CanvasCard entity={entity} isFocused={focusedId === entity.id} />
								) : entity.presentation === 'folder' ? (
									<FolderStack
										entityId={entity.id}
										entityIds={(entity.state?.child_ids as string[]) ?? [entity.id]}
										label={entity.summary || entity.type}
										onClick={() => useEntityStore.getState().scatterFolder(entity.id)}
									/>
								) : null}
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			)}
		</div>
	)
}
