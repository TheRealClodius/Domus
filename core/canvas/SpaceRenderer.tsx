'use client'

import { Box } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { getAppType, getDockApps } from '@/apps/_registry'
import type { AppDockItem } from '@/core/canvas/AppDock'
import AppDock from '@/core/canvas/AppDock'
import { createEntityFromApp } from '@/core/canvas/createEntityFromApp'
import SpaceHeader, { type SpaceHeaderUser } from '@/core/canvas/SpaceHeader'
import CanvasCard from '@/core/entity/CanvasCard'
import FolderStack from '@/core/entity/FolderStack'
import Window from '@/core/entity/Window'
import { useEntityStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import {
	ANCHOR_OFFSET_X,
	ANCHOR_OFFSET_Y,
	CARD_ANCHOR_PX,
	GATHER_SCALE,
} from '@/core/spatial/folderConstants'
import { usePartAroundObstacle } from '@/core/spatial/usePartAroundObstacle'
import { getLucideIcon } from '@/lib/lucideIcon'
import { SPRING } from '@/lib/motion'

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
const partingIds = new Set<string>()
const scatteringIds = new Set<string>()
const scatterDelayMap = new Map<string, number>()
const gatheringIds = new Set<string>()
const gatherRotationMap = new Map<string, number>()

/** Rotation targets matching folder IDLE card angles */
const GATHER_ROTATIONS = [-20, 0, 20]

export function markJustDragged(id: string) {
	skipAnimationIds.add(id)
	// Use setTimeout(0) — runs after React's synchronous render from the
	// Zustand update that follows this call. rAF is unreliable because
	// React 19 can batch and defer renders past a single animation frame.
	setTimeout(() => {
		skipAnimationIds.delete(id)
	}, 0)
}

export function markParting(ids: string[]) {
	for (const id of ids) partingIds.add(id)
	setTimeout(() => {
		for (const id of ids) partingIds.delete(id)
	}, 0)
}

export function markScattering(ids: string[], staggerMs = 40) {
	// Clear any lingering gathering marks so cards revert to scale 1 / rotate 0
	for (const id of ids) {
		gatheringIds.delete(id)
		gatherRotationMap.delete(id)
	}
	for (let i = 0; i < ids.length; i++) {
		scatteringIds.add(ids[i])
		scatterDelayMap.set(ids[i], (i * staggerMs) / 1000)
	}
	setTimeout(() => {
		for (const id of ids) {
			scatteringIds.delete(id)
			scatterDelayMap.delete(id)
		}
	}, 0)
}

export function markGathering(ids: string[]) {
	gatheringIds.clear()
	gatherRotationMap.clear()
	for (let i = 0; i < ids.length; i++) {
		gatheringIds.add(ids[i])
		gatherRotationMap.set(ids[i], GATHER_ROTATIONS[i % GATHER_ROTATIONS.length])
	}
	// Auto-clear after gather completes (600ms phase + 200ms spring settle buffer)
	setTimeout(() => {
		for (const id of ids) {
			gatheringIds.delete(id)
			gatherRotationMap.delete(id)
		}
	}, 800)
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
	if (partingIds.has(entityId)) {
		return {
			opacity: SPRING.popIn,
			scale: SPRING.popIn,
			y: SPRING.popIn,
			left: SPRING.part,
			top: SPRING.part,
			width: SPRING.part,
			height: SPRING.part,
		}
	}
	if (scatteringIds.has(entityId)) {
		const delay = scatterDelayMap.get(entityId) ?? 0
		return {
			opacity: SPRING.popIn,
			scale: { ...SPRING.folder, delay },
			y: { duration: 0 },
			left: { ...SPRING.folder, delay },
			top: { ...SPRING.folder, delay },
			width: { ...SPRING.folder, delay },
			height: { ...SPRING.folder, delay },
		}
	}
	if (gatheringIds.has(entityId)) {
		return {
			opacity: SPRING.popIn,
			scale: SPRING.folder,
			rotate: SPRING.folder,
			y: SPRING.popIn,
			left: SPRING.folder,
			top: SPRING.folder,
			width: SPRING.folder,
			height: SPRING.folder,
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
	const windowAreaRef = useRef<HTMLDivElement>(null)
	usePartAroundObstacle(canvasRef)
	const entities = useEntityStore((s) => s.entities)
	const focusedId = useEntityStore((s) => s.focusedId)
	const setFocused = useEntityStore((s) => s.setFocused)
	const upsert = useEntityStore((s) => s.upsert)
	const updatePresentation = useEntityStore((s) => s.updatePresentation)

	const clearSelection = useEntityStore((s) => s.clearSelection)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') clearSelection()
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [clearSelection])

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

	/** Click handler for generated app dock items — focus/show existing entity */
	const handleGeneratedDockClick = useCallback(
		(entityId: string) => {
			const current = useEntityStore.getState().entities
			const entity = current[entityId]
			if (!entity) return
			if (entity.presentation === 'hidden') {
				updatePresentation(entityId, 'window')
			}
			setFocused(entityId)
		},
		[setFocused, updatePresentation],
	)

	const dockItems = dockApps.map((app) => ({
		id: app.type,
		icon: <app.icon className="size-5" />,
		label: app.name,
		onClick: () => handleDockClick(app.type),
	}))

	/** Generated app entities — entities with _code in state, not archived */
	const generatedApps = useMemo(() => {
		return Object.values(entities).filter((e) => typeof e.state?._code === 'string' && !e.archived)
	}, [entities])

	const generatedDockItems: AppDockItem[] = useMemo(() => {
		return generatedApps.map((entity) => {
			const meta = entity.state._meta as { name?: string; icon?: string } | undefined
			const iconName = meta?.icon
			const Icon = iconName ? getLucideIcon(iconName) : undefined
			return {
				id: entity.id,
				icon: Icon ? <Icon className="size-5" /> : <Box className="size-5" />,
				label: meta?.name ?? entity.summary ?? 'App',
				onClick: () => handleGeneratedDockClick(entity.id),
			}
		})
	}, [generatedApps, handleGeneratedDockClick])

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: Canvas background click clears focus
		<div
			ref={canvasRef}
			data-testid="canvas"
			className="relative w-full h-full bg-surface-dim overflow-hidden"
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
				<AppDock items={dockItems} generatedItems={generatedDockItems} />
			</div>

			{visible.length === 0 ? (
				<div className="flex items-center justify-center h-full">
					<p className="text-on-surface-muted">Talk to the agent or open an app from the dock.</p>
				</div>
			) : (
				/* Window area — pointer-events: none, individual entities opt in */
				<div
					ref={windowAreaRef}
					data-testid="window-area"
					style={{
						position: 'absolute',
						inset: 0,
						zIndex: 10,
						pointerEvents: 'none',
					}}
				>
					<AnimatePresence>
						{visible.map((entity) => {
							const scatterOrigin = entity.state?._scatterOrigin as
								| { x: number; y: number }
								| undefined

							const isGathering = gatheringIds.has(entity.id)
							const targetScale = isGathering ? GATHER_SCALE : 1
							const targetRotate = gatherRotationMap.get(entity.id) ?? 0
							const origin = isGathering || scatterOrigin ? CARD_ANCHOR_PX : undefined
							// Folders appearing during gather skip entrance animation (no twitch)
							const skipEntrance = !!entity.state?._gatherPhase

							return (
								<motion.div
									key={entity.id}
									data-entity-wrapper
									initial={{
										opacity: scatterOrigin || skipEntrance ? 1 : 0,
										scale: scatterOrigin ? GATHER_SCALE : skipEntrance ? 1 : 0.98,
										rotate: 0,
										y: scatterOrigin || skipEntrance ? 0 : 8,
										left: scatterOrigin ? scatterOrigin.x - ANCHOR_OFFSET_X : entity.position.x,
										top: scatterOrigin ? scatterOrigin.y - ANCHOR_OFFSET_Y : entity.position.y,
										width: entity.size.width,
										height: entity.size.height,
									}}
									animate={{
										opacity: 1,
										scale: targetScale,
										rotate: targetRotate,
										y: 0,
										left: entity.position.x,
										top: entity.position.y,
										width: entity.size.width,
										height: entity.size.height,
									}}
									exit={isGathering ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
									transition={getEntityTransition(entity.id)}
									style={{
										position: 'absolute',
										zIndex: entity.z_index,
										pointerEvents: isGathering ? 'none' : undefined,
										transformOrigin: origin,
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
										<CanvasCard
											entity={entity}
											isFocused={focusedId === entity.id}
											interactive={!gatheringIds.has(entity.id)}
										/>
									) : entity.presentation === 'folder' ? (
										<div className="flex items-center justify-center w-full h-full">
											<FolderStack
												entityId={entity.id}
												entityIds={(entity.state?.child_ids as string[]) ?? [entity.id]}
												label={entity.summary || entity.type}
												onClick={() => useSheetStore.getState().open(entity.id, 'entity')}
												onRename={(newLabel) => {
													const current = useEntityStore.getState().entities[entity.id]
													if (current) {
														upsert({
															...current,
															summary: newLabel,
															updated_at: new Date().toISOString(),
														})
													}
												}}
											/>
										</div>
									) : null}
								</motion.div>
							)
						})}
					</AnimatePresence>
				</div>
			)}
		</div>
	)
}
