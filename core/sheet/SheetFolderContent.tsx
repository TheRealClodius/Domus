'use client'

import { ArrowUpRight } from 'lucide-react'
import { markScattering } from '@/core/spatial/animationDirector'
import { useEntityStore, useSpatialStore } from '@/core/entityStore'
import { useSheetStore } from '@/core/sheetStore'
import { Button } from '@/core/ui/button'

const THUMB_W = 120
const THUMB_H = 155

export default function SheetFolderContent({ entityId }: { entityId: string }) {
	const folder = useEntityStore((s) => s.entities[entityId])
	const entities = useEntityStore((s) => s.entities)
	const scatterFolder = useSpatialStore((s) => s.scatterFolder)
	const ejectFromFolder = useSpatialStore((s) => s.ejectFromFolder)

	if (!folder || folder.presentation !== 'folder') {
		return <p className="text-on-surface-muted">Folder not found</p>
	}

	const childIds = (folder.state?.child_ids ?? []) as string[]
	const children = childIds.map((id) => entities[id]).filter(Boolean)

	const handlePushOne = (childId: string) => {
		const canvas = document.querySelector<HTMLElement>('[data-testid="canvas"]')
		const vp = canvas
			? { width: canvas.clientWidth, height: canvas.clientHeight }
			: { width: window.innerWidth, height: window.innerHeight }
		// Close sheet first, scatter after exit animation completes
		useSheetStore.getState().close(() => {
			markScattering([childId])
			ejectFromFolder(entityId, childId, vp)
		})
	}

	const handlePushAll = () => {
		const ids = [...childIds]
		const canvas = document.querySelector<HTMLElement>('[data-testid="canvas"]')
		const vp = canvas
			? { width: canvas.clientWidth, height: canvas.clientHeight }
			: { width: window.innerWidth, height: window.innerHeight }
		// Close sheet first, scatter after exit animation completes
		useSheetStore.getState().close(() => {
			markScattering(ids, 60)
			scatterFolder(entityId, vp)
		})
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 border-b border-outline-dim">
				<h2 className="font-display text-title-md text-on-surface">
					{folder.summary || 'Folder'} ({childIds.length})
				</h2>
				<Button variant="pill-secondary" size="pill" onClick={handlePushAll}>
					<ArrowUpRight />
					Push all to canvas
				</Button>
			</div>

			{/* Thumbnail grid */}
			<div className="flex-1 overflow-auto p-6">
				<div className="flex flex-wrap gap-4">
					{children.map((child) => (
						<button
							key={child.id}
							type="button"
							className="group/thumb relative rounded-lg bg-surface-raised shadow-card overflow-hidden hover:shadow-focused transition-shadow"
							style={{ width: THUMB_W, height: THUMB_H }}
							onClick={() => handlePushOne(child.id)}
						>
							{/* Placeholder skeleton */}
							<div className="flex flex-col gap-1 p-3">
								<p className="text-label text-on-surface truncate">{child.type}</p>
								<p className="text-body-xs text-on-surface-muted line-clamp-3">{child.summary}</p>
							</div>

							{/* Hover overlay */}
							<div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
								<span className="text-label text-white flex items-center gap-1">
									<ArrowUpRight className="size-3.5" />
									Push
								</span>
							</div>
						</button>
					))}
				</div>
			</div>
		</div>
	)
}
