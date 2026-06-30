'use client'

import { motion } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import { useDragEntity } from '@/core/canvas/useDragEntity'
import { useAgentUiStore } from '@/core/entityStore'
import { THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH } from '@/core/spatial/folderConstants'
import { Button } from '@/core/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/core/ui/dialog'
import { SPRING } from '@/lib/motion'

interface FolderStackProps {
	/** Primary entity ID for drag/focus */
	entityId: string
	/** Entity IDs in this group (used for count display) */
	entityIds: string[]
	/** Optional label shown below the stack */
	label?: string
	onClick?: () => void
	onRename?: (newLabel: string) => void
}

/** Bottom-center rotation anchor: center-x, 4px from bottom edge */
const CARD_ANCHOR = '50% calc(100% - 4px)'

/** Resting fan: pure rotation spread from bottom-center anchor */
const IDLE = [{ rotate: -20 }, { rotate: 0 }, { rotate: 20 }]

/** Hover/approaching fan: wider spread (+10deg each) */
const FANNED = [{ rotate: -30 }, { rotate: 20 }, { rotate: 30 }]

/** Stagger delays per card (back-to-front) */
const STAGGER = [0.1, 0.15, 0.2]

const MAX_LABEL_LENGTH = 24

export default function FolderStack({
	entityId,
	entityIds,
	label,
	onClick,
	onRename,
}: FolderStackProps) {
	const setFocused = useEntityStore((s) => s.setFocused)
	const archive = useEntityStore((s) => s.archive)
	const folderEntity = useEntityStore((s) => s.entities[entityId])
	const isAgentActive = useAgentUiStore((s) => s.agentActiveIds.has(entityId))
	const gatherPhase = useEntityStore(
		(s) => s.entities[entityId]?.state?._gatherPhase as string | undefined,
	)
	const scatterPhase = useEntityStore(
		(s) => s.entities[entityId]?.state?._scatterPhase as string | undefined,
	)
	const { bind: dragBind } = useDragEntity(entityId)
	const [hovered, setHovered] = useState(false)
	const [editing, setEditing] = useState(false)
	const [confirmOpen, setConfirmOpen] = useState(false)
	const labelRef = useRef<HTMLSpanElement>(null)

	const commitRename = useCallback(() => {
		const text = labelRef.current?.textContent?.trim() ?? ''
		setEditing(false)
		if (text && text !== label) {
			onRename?.(text)
		}
	}, [label, onRename])

	const handleDelete = useCallback(() => {
		const childIds = (folderEntity?.state?.child_ids as string[] | undefined) ?? []
		if (childIds.length > 0) {
			setConfirmOpen(true)
		} else {
			archive(entityId)
		}
	}, [folderEntity, entityId, archive])

	const confirmDelete = useCallback(() => {
		const childIds = (folderEntity?.state?.child_ids as string[] | undefined) ?? []
		// Archive all children first, then the folder
		for (const childId of childIds) {
			archive(childId)
		}
		archive(entityId)
		setConfirmOpen(false)
	}, [folderEntity, entityId, archive])

	const isFanned = hovered || gatherPhase === 'approaching' || scatterPhase === 'spraying'
	const childCount = (folderEntity?.state?.child_ids as string[] | undefined)?.length ?? 0

	return (
		<>
			{/* P2-A: hover on outer div so label pill doesn't collapse fan when cursor moves to it */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: mouseEnter/Leave are hover-only, not keyboard-relevant */}
			<div
				className="relative"
				style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
			>
				<button
					type="button"
					data-testid="folder-stack"
					aria-label={label ? `${label} (${entityIds.length} items)` : `${entityIds.length} items`}
					onClick={onClick}
					onMouseDown={() => setFocused(entityId)}
					onContextMenu={(e) => {
						e.preventDefault()
						handleDelete()
					}}
					{...dragBind()}
					className={`group relative cursor-grab active:cursor-grabbing overflow-visible ${isAgentActive ? 'shadow-agent-attention' : ''}`}
					style={{
						width: THUMBNAIL_WIDTH,
						height: THUMBNAIL_HEIGHT,
						pointerEvents: 'auto',
						touchAction: 'none',
					}}
				>
					{[0, 1, 2].map((i) => {
						const target = isFanned ? FANNED[i] : IDLE[i]
						return (
							<motion.div
								key={i}
								className="absolute inset-0 rounded-xl bg-surface-lowest shadow-card"
								animate={{ rotate: target.rotate }}
								transition={{ ...SPRING.gentle, delay: hovered ? STAGGER[i] : 0 }}
								style={{ zIndex: 2 - i, transformOrigin: CARD_ANCHOR }}
							/>
						)
					})}
				</button>

				{/* Label pill — single span, contentEditable when renaming */}
				{label && (
					// biome-ignore lint/a11y/noStaticElementInteractions: double-click to rename
					<span
						ref={labelRef}
						data-testid="folder-label"
						contentEditable={editing}
						suppressContentEditableWarning
						onDoubleClick={() => {
							setEditing(true)
							requestAnimationFrame(() => {
								const el = labelRef.current
								if (!el) return
								const range = document.createRange()
								range.selectNodeContents(el)
								const sel = window.getSelection()
								sel?.removeAllRanges()
								sel?.addRange(range)
							})
						}}
						onBlur={() => editing && commitRename()}
						onInput={() => {
							const el = labelRef.current
							if (!el) return
							const text = el.textContent ?? ''
							if (text.length > MAX_LABEL_LENGTH) {
								el.textContent = text.slice(0, MAX_LABEL_LENGTH)
								// Move cursor to end after clamping
								const range = document.createRange()
								range.selectNodeContents(el)
								range.collapse(false)
								const sel = window.getSelection()
								sel?.removeAllRanges()
								sel?.addRange(range)
							}
						}}
						onKeyDown={(e) => {
							if (!editing) return
							if (e.key === 'Enter') {
								e.preventDefault()
								commitRename()
							}
							if (e.key === 'Escape') {
								if (labelRef.current) labelRef.current.textContent = label
								setEditing(false)
							}
						}}
						className={`absolute left-1/2 -translate-x-1/2 rounded-full backdrop-blur-[4px] px-2 py-0.5 text-body text-on-surface text-center whitespace-nowrap shadow-[0px_2px_10px_0px_rgba(0,0,0,0.25)] outline-none ${editing ? 'bg-white/80 ring-2 ring-primary/40' : 'bg-white/60 overflow-hidden text-ellipsis'}`}
						style={{
							top: 84,
							zIndex: 10,
							maxWidth: 160,
							pointerEvents: 'auto',
							cursor: editing ? 'text' : 'pointer',
						}}
					>
						{label}
					</span>
				)}
			</div>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Delete folder?</DialogTitle>
						<DialogDescription>
							{label ? `"${label}"` : 'This folder'} contains {childCount}{' '}
							{childCount === 1 ? 'item' : 'items'}. Deleting it will also delete all items inside.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setConfirmOpen(false)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={confirmDelete}>
							Delete all
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
