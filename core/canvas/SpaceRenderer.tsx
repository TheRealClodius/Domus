'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useCallback } from 'react'
import { getDockApps } from '@/apps/_registry'
import AppDock from '@/core/canvas/AppDock'
import { createEntityFromApp } from '@/core/canvas/createEntityFromApp'
import SpaceHeader, { type SpaceHeaderUser } from '@/core/canvas/SpaceHeader'
import CanvasCard from '@/core/entity/CanvasCard'
import FolderStack from '@/core/entity/FolderStack'
import Window from '@/core/entity/Window'
import { useEntityStore } from '@/core/entityStore'
import { SPRING } from '@/lib/motion'

const dockApps = getDockApps()

interface SpaceRendererProps {
	spaceId: string
	userId?: string
	spaceName?: string
	user?: SpaceHeaderUser
}

export default function SpaceRenderer({ spaceId, userId, spaceName, user }: SpaceRendererProps) {
	const entities = useEntityStore((s) => s.entities)
	const focusedId = useEntityStore((s) => s.focusedId)
	const setFocused = useEntityStore((s) => s.setFocused)
	const upsert = useEntityStore((s) => s.upsert)
	const updatePresentation = useEntityStore((s) => s.updatePresentation)

	const visible = Object.values(entities).filter((e) => e.presentation !== 'hidden')

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
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={SPRING.popIn}
								style={{
									position: 'absolute',
									left: entity.position.x,
									top: entity.position.y,
									zIndex: entity.z_index,
								}}
							>
								{entity.presentation === 'window' ? (
									<Window entity={entity} isFocused={focusedId === entity.id} />
								) : entity.presentation === 'card' ? (
									<CanvasCard entity={entity} />
								) : entity.presentation === 'folder' ? (
									<FolderStack entityIds={[entity.id]} label={entity.type} />
								) : null}
							</motion.div>
						))}
					</AnimatePresence>
				</div>
			)}
		</div>
	)
}
