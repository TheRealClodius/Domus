'use client'

import { Box } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDockApps } from '@/apps/_registry'
import type { AppDockItem } from '@/core/canvas/AppDock'
import AppDock from '@/core/canvas/AppDock'
import { createEntityFromApp } from '@/core/canvas/createEntityFromApp'
import SpaceHeader, { type SpaceHeaderUser } from '@/core/canvas/SpaceHeader'
import SpaceSwitcher from '@/core/canvas/SpaceSwitcher'
import EntityShell from '@/core/entity/EntityShell'
import { useEntityStore, useSpatialStore } from '@/core/entityStore'
import {
	getEntityTransition,
	getGatherRotation,
	isGathering,
} from '@/core/spatial/animationDirector'
import CanvasViewport from '@/core/spatial/CanvasViewport'
import {
	ANCHOR_OFFSET_X,
	ANCHOR_OFFSET_Y,
	CARD_ANCHOR_PX,
	GATHER_SCALE,
} from '@/core/spatial/folderConstants'
import { usePartAroundObstacle } from '@/core/spatial/usePartAroundObstacle'
import { Button } from '@/core/ui/button'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/core/ui/dialog'
import { getLucideIcon } from '@/lib/lucideIcon'

const dockApps = getDockApps()

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
	const archive = useEntityStore((s) => s.archive)

	const clearSelection = useSpatialStore((s) => s.clearSelection)

	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
	const [switcherOpen, setSwitcherOpen] = useState(false)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') clearSelection()
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [clearSelection])

	const visible = Object.values(entities).filter(
		(e) =>
			e.presentation !== 'hidden' &&
			!e.archived &&
			!(e.state?._folderId && !e.state?._scatterOrigin),
	)

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

	/** Optimistic archive + server delete, fire-and-forget */
	const confirmDelete = useCallback(() => {
		if (!pendingDeleteId) return
		archive(pendingDeleteId)
		fetch(`/api/entities/${pendingDeleteId}`, { method: 'DELETE' }).catch((err) =>
			console.error('[SpaceRenderer] DELETE entity failed', pendingDeleteId, err),
		)
		setPendingDeleteId(null)
	}, [pendingDeleteId, archive])

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
				onDelete: () => setPendingDeleteId(entity.id),
			}
		})
	}, [generatedApps, handleGeneratedDockClick])

	const pendingDeleteName = pendingDeleteId
		? (() => {
				const entity = entities[pendingDeleteId]
				const meta = entity?.state?._meta as { name?: string } | undefined
				return meta?.name ?? entity?.summary ?? 'App'
			})()
		: ''

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
			<SpaceHeader
				spaceName={spaceName ?? 'My Space'}
				user={user}
				onSwitchSpace={() => setSwitcherOpen(true)}
			/>

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
				<CanvasViewport>
					{/* Window area — pointer-events: none, individual entities opt in */}
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

								const gathering = isGathering(entity.id)
								const targetScale = gathering ? GATHER_SCALE : 1
								const targetRotate = getGatherRotation(entity.id)
								const origin = gathering || scatterOrigin ? CARD_ANCHOR_PX : undefined
								// Folders appearing during gather or created by agent skip entrance animation
								const skipEntrance = !!entity.state?._gatherPhase || !!entity.state?._agentFolder

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
										exit={gathering ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
										transition={getEntityTransition(entity.id)}
										style={{
											position: 'absolute',
											zIndex: entity.z_index,
											pointerEvents: gathering ? 'none' : undefined,
											transformOrigin: origin,
										}}
									>
										<EntityShell
											entity={entity}
											isFocused={focusedId === entity.id}
											interactive={!gathering}
										/>
									</motion.div>
								)
							})}
						</AnimatePresence>
					</div>
				</CanvasViewport>
			)}

			{userId && switcherOpen ? (
				<SpaceSwitcher
					open={switcherOpen}
					onOpenChange={setSwitcherOpen}
					currentSpaceId={spaceId}
					userId={userId}
				/>
			) : null}

			{/* Confirm delete dialog for generated apps */}
			<Dialog
				open={pendingDeleteId !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDeleteId(null)
				}}
			>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Delete {pendingDeleteName}?</DialogTitle>
						<DialogDescription>This will remove the app permanently.</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="ghost">Cancel</Button>
						</DialogClose>
						<Button variant="destructive" onClick={confirmDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
